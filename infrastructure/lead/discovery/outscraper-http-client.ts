import type { LeadSearchInput } from '@/domain/lead/lead.discovery';

export interface OutscraperResult {
  readonly name: string;
  readonly category?: string;
  readonly website?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
}

export interface OutscraperClient {
  search(input: LeadSearchInput): Promise<OutscraperResult[]>;
}

interface OutscraperHttpClientConfig {
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

interface OutscraperPlace {
  readonly name?: unknown;
  readonly category?: unknown;
  readonly type?: unknown;
  readonly site?: unknown;
  readonly phone?: unknown;
  readonly email?: unknown;
  readonly full_address?: unknown;
  readonly city?: unknown;
}

interface OutscraperResponse {
  readonly data?: unknown;
}

const DEFAULT_ENDPOINT = 'https://api.app.outscraper.com/maps/search-v3';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 20;

export class OutscraperDiscoveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OutscraperDiscoveryError';
  }
}

export class OutscraperHttpClient implements OutscraperClient {
  private readonly apiKey?: string;
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: OutscraperHttpClientConfig = {}) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? 0;
  }

  async search(input: LeadSearchInput): Promise<OutscraperResult[]> {
    const requestUrl = this.buildRequestUrl(input);

    return this.withRetry(() => this.fetchPlaces(requestUrl));
  }

  private buildRequestUrl(input: LeadSearchInput) {
    const requestUrl = new URL(this.endpoint);
    requestUrl.searchParams.set('query', `${input.query} ${input.location}`);
    requestUrl.searchParams.set('limit', String(input.quantity ?? DEFAULT_LIMIT));

    return requestUrl.toString();
  }

  private async fetchPlaces(requestUrl: string): Promise<OutscraperResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(requestUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new OutscraperDiscoveryError(
          `Outscraper search failed with status ${response.status}`
        );
      }

      return parseOutscraperResponse((await response.json()) as unknown);
    } catch (error) {
      if (error instanceof OutscraperDiscoveryError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new OutscraperDiscoveryError('Outscraper search timed out', {
          cause: error
        });
      }

      throw new OutscraperDiscoveryError('Outscraper search failed', {
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    return headers;
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

export function parseOutscraperResponse(response: unknown): OutscraperResult[] {
  const data = (response as OutscraperResponse | null)?.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizePlace).filter(isValidResult);
}

function isValidResult(result: OutscraperResult): result is OutscraperResult {
  return result.name.length > 0;
}

function normalizePlace(place: OutscraperPlace): OutscraperResult {
  const name = stringValue(place.name);

  return {
    name: name ?? '',
    category: stringValue(place.category) ?? stringValue(place.type),
    website: stringValue(place.site),
    phone: stringValue(place.phone),
    email: stringValue(place.email),
    address: stringValue(place.full_address),
    city: stringValue(place.city)
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}
