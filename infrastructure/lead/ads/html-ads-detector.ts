import { createLogger } from '@/infrastructure/logging/logger';
import type {
  AdsDetectionPort,
  AdsDetectionResult
} from '@/domain/lead/lead.ads';

const log = createLogger('ads-detector');

type FetchFn = typeof fetch;

interface HtmlAdsDetectorConfig {
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const NO_ADS: AdsDetectionResult = {
  hasGoogleAds: false,
  hasMetaPixel: false,
  hasGtm: false
};

/** Markers for Google Ads / Google Ads conversion tracking. */
const GOOGLE_ADS_MARKERS = [
  'google_ads',
  'gtag/js?id=aw-',
  'googletagmanager.com/a',
  'google_conversion',
  'google_remarketing',
  'adsbygoogle',
  'pagead2.googlesyndication',
  'www.googleadservices.com'
];

/** Markers for Meta (Facebook/Instagram) Pixel. */
const META_PIXEL_MARKERS = [
  'fbq(',
  'fbevents.js',
  'facebook.net/en_US/fbevents',
  'facebook.net/en_US/fbq',
  'connect.facebook.net',
  '_fbq'
];

/** Markers for Google Tag Manager (container snippet). */
const GTM_MARKERS = [
  'googletagmanager.com/gtm.js',
  'gtm.js',
  'data-layer.push'
];

/**
 * Heuristic, marker-based ad-tracking detection. Fetches the site's HTML and
 * matches known advertising-script markers against the lowercase source.
 * Best-effort by design: a miss yields `hasAds = false`, never a pipeline
 * failure.
 */
export class HtmlAdsDetector implements AdsDetectionPort {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRedirects: number;

  constructor(config: HtmlAdsDetectorConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRedirects = config.maxRedirects ?? 5;
  }

  private detectFromHtml(html: string): AdsDetectionResult {
    const source = html.toLowerCase();
    return {
      hasGoogleAds: GOOGLE_ADS_MARKERS.some((m) => source.includes(m)),
      hasMetaPixel: META_PIXEL_MARKERS.some((m) => source.includes(m)),
      hasGtm: GTM_MARKERS.some((m) => source.includes(m))
    };
  }

  private async fetchHtml(url: string): Promise<string | null> {
    let currentUrl = url;
    let redirects = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await this.fetchFn(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { accept: 'text/html,application/xhtml+xml' }
        });
      } catch (error) {
        log.debug('Fetch failed for ads detection', {
          url: currentUrl,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      } finally {
        clearTimeout(timeout);
      }

      if (
        (response.status >= 300 && response.status < 400) ||
        response.status === 301 ||
        response.status === 302
      ) {
        if (redirects >= this.maxRedirects) return null;
        const location = response.headers.get('location');
        if (!location) return null;
        redirects += 1;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        log.debug('Non-OK response for ads detection', {
          url: currentUrl,
          status: response.status
        });
        return null;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return text.slice(0, MAX_RESPONSE_BYTES);
      }

      const decoder = new TextDecoder();
      let accumulated = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          if (accumulated.length > MAX_RESPONSE_BYTES) break;
        }
        accumulated += decoder.decode();
      } catch (error) {
        log.debug('Read aborted for ads detection', {
          url: currentUrl,
          error: error instanceof Error ? error.message : String(error)
        });
        return accumulated;
      } finally {
        reader.releaseLock();
      }

      return accumulated.slice(0, MAX_RESPONSE_BYTES);
    }
  }

  async detect(url: string): Promise<AdsDetectionResult> {
    const html = await this.fetchHtml(url);
    if (html === null) {
      log.debug('No usable HTML for ads detection', { url });
      return NO_ADS;
    }

    const result = this.detectFromHtml(html);
    const detected = [
      result.hasGoogleAds && 'Google Ads',
      result.hasMetaPixel && 'Meta Pixel',
      result.hasGtm && 'GTM'
    ]
      .filter(Boolean)
      .join(', ');

    log.debug('Ads detection done', {
      url,
      detected: detected || 'none',
      ...result
    });

    return result;
  }
}
