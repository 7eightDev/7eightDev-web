import type {
  DiscoveredLead,
  LeadSearchInput,
  LeadDiscoveryPort
} from '@/domain/lead/lead.discovery';
import { withRetry, HttpError } from '@/infrastructure/shared/retry';

interface GooglePlacesLeadDiscoveryConfig {
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly pageSize?: number;
  readonly maxPages?: number;
}

interface TextSearchRequest {
  readonly textQuery: string;
  readonly pageSize?: number;
  readonly pageToken?: string;
}

interface PlacesResponse {
  readonly places?: unknown;
  readonly nextPageToken?: unknown;
}

interface AddressComponent {
  readonly longText?: unknown;
  readonly shortText?: unknown;
  readonly types?: unknown;
}

const DEFAULT_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 5;
const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.addressComponents'
].join(',');

export class GooglePlacesDiscoveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GooglePlacesDiscoveryError';
  }
}

export class GooglePlacesLeadDiscovery implements LeadDiscoveryPort {
  private readonly apiKey?: string;
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(config: GooglePlacesLeadDiscoveryConfig = {}) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? 2;
    this.pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
    this.maxPages = config.maxPages ?? DEFAULT_MAX_PAGES;
  }

  async search(input: LeadSearchInput): Promise<DiscoveredLead[]> {
    const targetQuantity = input.quantity ?? this.pageSize;
    const results: DiscoveredLead[] = [];
    const pageSize = input.quantity
      ? Math.min(input.quantity, this.pageSize)
      : this.pageSize;
    let pageToken: string | undefined;
    let pages = 0;

    do {
      pages += 1;

      const request: TextSearchRequest = {
        textQuery: `${input.query} ${input.location}`,
        pageSize,
        ...(pageToken ? { pageToken } : {})
      };

      const page = await withRetry(
        () => this.fetchPlaces(request),
        { maxRetries: this.maxRetries, baseDelayMs: 500, maxDelayMs: 10_000 },
        (error) => !(error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 429)
      );

      results.push(...page.places);

      pageToken = page.nextPageToken;
    } while (
      pageToken &&
      pages < this.maxPages &&
      results.length < targetQuantity
    );

    return results.slice(0, targetQuantity);
  }

  private async fetchPlaces(request: TextSearchRequest): Promise<{
    places: DiscoveredLead[];
    nextPageToken?: string;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(request),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new HttpError(
          `Google Places search failed with status ${response.status}`,
          response.status
        );
      }

      return parseSearchResponse((await response.json()) as unknown);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new GooglePlacesDiscoveryError('Google Places search timed out', {
          cause: error
        });
      }

      throw new GooglePlacesDiscoveryError('Google Places search failed', {
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': FIELD_MASK
    };

    if (this.apiKey) {
      headers['X-Goog-Api-Key'] = this.apiKey;
    }

    return headers;
  }

}

export function parseSearchResponse(response: unknown): {
  places: DiscoveredLead[];
  nextPageToken?: string;
} {
  const places = (response as PlacesResponse | null)?.places;
  const nextPageToken = (response as PlacesResponse | null)?.nextPageToken;

  if (!Array.isArray(places)) {
    return { places: [] };
  }

  return {
    places: places.map(normalizePlace).filter(isValidPlace),
    nextPageToken:
      typeof nextPageToken === 'string' && nextPageToken.length > 0
        ? nextPageToken
        : undefined
  };
}

function normalizePlace(place: Place): DiscoveredLead {
  const companyName = stringValue(firstText(place.displayName));

  return {
    companyName: companyName ?? '',
    category: stringValue(discoverCategory(place.types)),
    website: stringValue(place.websiteUri),
    phone: stringValue(place.nationalPhoneNumber),
    email: undefined,
    address: stringValue(place.formattedAddress),
    city: stringValue(extractLocality(place.addressComponents))
  };
}

function isValidPlace(place: DiscoveredLead): boolean {
  return place.companyName.length > 0;
}

function extractLocality(
  components: AddressComponent[] | undefined
): string | undefined {
  if (!Array.isArray(components)) {
    return undefined;
  }

  const locality = components.find(
    (component) =>
      Array.isArray(component.types) &&
      (component.types as unknown[]).includes('locality')
  );

  return locality ? stringValue(locality.longText) : undefined;
}

function firstText(displayName: Place['displayName']): unknown {
  return displayName?.text;
}

const GENERIC_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'business'
]);

function discoverCategory(types: unknown): string | undefined {
  if (!Array.isArray(types)) {
    return undefined;
  }

  const category = (types as unknown[]).find(
    (type): type is string =>
      typeof type === 'string' && !GENERIC_TYPES.has(type)
  );

  return stringValue(category);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

interface Place {
  readonly displayName?: { readonly text?: unknown };
  readonly formattedAddress?: unknown;
  readonly nationalPhoneNumber?: unknown;
  readonly websiteUri?: unknown;
  readonly addressComponents?: AddressComponent[];
  readonly types?: unknown;
}
