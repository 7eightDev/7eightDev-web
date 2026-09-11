import {
  PageSpeedAnalysisError,
  type PageSpeedInput,
  type PageSpeedPort,
  type PageSpeedResult
} from '@/domain/lead/lead.pagespeed';
import { withRetry, HttpError } from '@/infrastructure/shared/retry';
import { timeMetricToSeconds } from '@/infrastructure/lead/lead.metrics';

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
// PageSpeed analyzes the page in a headless browser, so slow sites (the ones we
// care about — low score = qualified lead) can take well over a minute.
const DEFAULT_TIMEOUT_MS = 60_000;

export class GooglePageSpeedInsights implements PageSpeedPort {
  private readonly endpoint: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: GooglePageSpeedInsightsConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? 2;
  }

  async analyze(input: PageSpeedInput): Promise<PageSpeedResult> {
    const targetUrl = normalizeHttpUrl(input.url);
    const requestUrl = this.buildRequestUrl(targetUrl, input.strategy);

    return withRetry(
      () => this.fetchAnalysis(requestUrl),
      { maxRetries: this.maxRetries, baseDelayMs: 1000, maxDelayMs: 30_000 },
      (error) => !(error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 429)
    );
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
        throw new HttpError(
          `PageSpeed request failed with status ${response.status}`,
          response.status
        );
      }

      return parsePageSpeedResponse((await response.json()) as unknown);
    } catch (error) {
      if (error instanceof HttpError) {
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

}

export function parsePageSpeedResponse(response: unknown): PageSpeedResult {
  const lighthouse = (response as LighthouseResponse | null)?.lighthouseResult;
  const audits = lighthouse?.audits;

  return {
    performanceScore: normalizePerformanceScore(
      lighthouse?.categories?.performance?.score
    ),
    // Lighthouse reports LCP/FCP in ms; the domain (thresholds, impact model,
    // report/email) uses seconds — normalize at the provider boundary.
    lcp: timeMetricToSeconds(
      metricValue(audits, 'largest-contentful-paint')
    ) ?? null,
    fcp:
      timeMetricToSeconds(metricValue(audits, 'first-contentful-paint')) ??
      null,
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
