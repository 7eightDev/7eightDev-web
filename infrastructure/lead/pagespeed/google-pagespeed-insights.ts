import {
  PageSpeedAnalysisError,
  type PageSpeedInput,
  type PageSpeedPort,
  type PageSpeedResult
} from '@/domain/lead/lead.pagespeed';

type FetchFn = typeof fetch;

interface GooglePageSpeedInsightsConfig {
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

interface LighthouseAudit {
  readonly numericValue?: unknown;
}

interface LighthouseResponse {
  readonly lighthouseResult?: {
    readonly categories?: {
      readonly performance?: {
        readonly score?: unknown;
      };
    };
    readonly audits?: Record<string, LighthouseAudit | undefined>;
  };
}

const DEFAULT_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const DEFAULT_TIMEOUT_MS = 10_000;

export class GooglePageSpeedInsights implements PageSpeedPort {
  private readonly endpoint: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: GooglePageSpeedInsightsConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? 0;
  }

  async analyze(input: PageSpeedInput): Promise<PageSpeedResult> {
    const targetUrl = normalizeHttpUrl(input.url);
    const requestUrl = this.buildRequestUrl(targetUrl, input.strategy);

    return this.withRetry(() => this.fetchAnalysis(requestUrl));
  }

  private buildRequestUrl(url: string, strategy: PageSpeedInput['strategy']) {
    const requestUrl = new URL(this.endpoint);
    requestUrl.searchParams.set('url', url);
    requestUrl.searchParams.set('strategy', strategy);

    if (this.config.apiKey) {
      requestUrl.searchParams.set('key', this.config.apiKey);
    }

    return requestUrl.toString();
  }

  private async fetchAnalysis(requestUrl: string): Promise<PageSpeedResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(requestUrl, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new PageSpeedAnalysisError(
          `PageSpeed request failed with status ${response.status}`
        );
      }

      return parsePageSpeedResponse((await response.json()) as unknown);
    } catch (error) {
      if (error instanceof PageSpeedAnalysisError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new PageSpeedAnalysisError('PageSpeed request timed out', {
          cause: error
        });
      }

      throw new PageSpeedAnalysisError('PageSpeed request failed', {
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }

        attempt += 1;
      }
    }
  }
}

export function parsePageSpeedResponse(response: unknown): PageSpeedResult {
  const lighthouse = (response as LighthouseResponse | null)?.lighthouseResult;
  const audits = lighthouse?.audits;

  return {
    performanceScore: normalizePerformanceScore(
      lighthouse?.categories?.performance?.score
    ),
    lcp: metricValue(audits, 'largest-contentful-paint'),
    fcp: metricValue(audits, 'first-contentful-paint'),
    cls: metricValue(audits, 'cumulative-layout-shift'),
    tbt: metricValue(audits, 'total-blocking-time')
  };
}

function normalizeHttpUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Unsupported URL protocol');
    }

    return parsed.toString();
  } catch (error) {
    throw new PageSpeedAnalysisError('PageSpeed input URL is invalid', {
      cause: error
    });
  }
}

function normalizePerformanceScore(score: unknown) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null;
  }

  return Math.round(score * 100);
}

function metricValue(
  audits: Record<string, LighthouseAudit | undefined> | undefined,
  auditId: string
) {
  const value = audits?.[auditId]?.numericValue;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}
