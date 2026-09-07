import { createLogger } from '@/infrastructure/logging/logger';
import type {
  TechSignature,
  TechStackPort
} from '@/domain/lead/lead.tech';

const log = createLogger('tech-detector');

type FetchFn = typeof fetch;

interface HtmlTechDetectorConfig {
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
  readonly signatures?: readonly TechSignature[];
}

/** Marker table for the most common Italian small-business site stacks. */
const DEFAULT_SIGNATURES: readonly TechSignature[] = [
  { name: 'WordPress', markers: ['wp-content', 'wp-includes', 'wp-json', 'content="wordpress'] },
  { name: 'WooCommerce', markers: ['woocommerce'] },
  { name: 'Elementor', markers: ['elementor'] },
  { name: 'Wix', markers: ['static.parastorage.com', 'wix.com', 'content="wix.com'] },
  { name: 'Squarespace', markers: ['content="squarespace', 'squarespace.com'] },
  { name: 'Shopify', markers: ['cdn.shopify.com', 'content="shopify'] },
  { name: 'PrestaShop', markers: ['prestashop', 'ps_version', 'content="prestashop'] },
  { name: 'Webflow', markers: ['content="webflow', 'webflow.com'] },
  { name: 'Jimdo', markers: ['jimdo'] },
  { name: 'Tilda', markers: ['tilda.ws', 'tilda.cc'] },
  { name: 'Joomla', markers: ['joomla', 'content="joomla'] },
  { name: 'Drupal', markers: ['content="drupal', '/sites/all/', 'drupal.js'] },
  { name: 'Blogger', markers: ['blogger', 'content="blogger'] },
  { name: 'jQuery', markers: ['jquery'] },
  { name: 'React', markers: ['react', '__reactinternal', 'data-reactroot'] },
  { name: 'Next.js', markers: ['__next_data__', '/_next/static'] },
  { name: 'Vue.js', markers: ['vue', 'vuex', 'data-v-'] },
  { name: 'Nuxt', markers: ['nuxt'] },
  { name: 'Angular', markers: ['ng-app', 'ng-version', 'ng-183'] },
  { name: 'Bootstrap', markers: ['bootstrap'] },
  { name: 'Alpine.js', markers: ['alpine.min.js', 'alpine.js', 'x-data='] }
];

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/**
 * Heuristic, marker-based technology detection. Fetches the site's HTML and
 * matches a signature table against the lowercase source. Best-effort by
 * design: a miss just yields an empty list, never a pipeline failure.
 */
export class HtmlTechDetector implements TechStackPort {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRedirects: number;
  private readonly signatures: readonly TechSignature[];

  constructor(config: HtmlTechDetectorConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRedirects = config.maxRedirects ?? 5;
    this.signatures = config.signatures ?? DEFAULT_SIGNATURES;
  }

  private detectFromHtml(html: string): string[] {
    const source = html.toLowerCase();
    return this.signatures
      .filter((signature) =>
        signature.markers.some((marker) => source.includes(marker))
      )
      .map((signature) => signature.name);
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
        log.debug('Fetch failed for tech detection', {
          url: currentUrl,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      } finally {
        clearTimeout(timeout);
      }

      if (
        (response.status >= 300 && response.status < 400) ||
        (response.status === 301 || response.status === 302)
      ) {
        if (redirects >= this.maxRedirects) return null;
        const location = response.headers.get('location');
        if (!location) return null;
        redirects += 1;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        log.debug('Non-OK response for tech detection', {
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
        log.debug('Read aborted for tech detection', {
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

  async detect(url: string): Promise<string[]> {
    const html = await this.fetchHtml(url);
    if (html === null) {
      log.debug('No usable HTML for tech detection', { url });
      return [];
    }

    const found = this.detectFromHtml(html);
    log.debug('Tech detection done', { url, technologies: found });
    return found;
  }
}