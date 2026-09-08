import { createLogger } from '@/infrastructure/logging/logger';
import type { CopyrightPort } from '@/domain/lead/lead.copyright';
import { isCopyrightPayload } from '@/domain/lead/lead.copyright';

const log = createLogger('copyright-detector');

type FetchFn = typeof fetch;

interface HtmlCopyrightDetectorConfig {
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
  readonly maxLength?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** Matches a copyright marker: © / &copy; / &#169; / "copyright". */
const COPYRIGHT_RE = /(?:©|&copy;|&#169;|&#xA9;|copyright)/i;
const YEAR_RE = /\d{4}/;

/**
 * Extracts the website's footer copyright line (e.g. "© 2019 Studio Rossi")
 * from its homepage HTML. The footer sits at the bottom of the document, so
 * the LAST copyright-bearing line wins — preferring the one carrying a year.
 * Best-effort by design: an unreachable or unrecognizable page simply yields
 * undefined, never a pipeline failure.
 */
export class HtmlCopyrightDetector implements CopyrightPort {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRedirects: number;
  private readonly maxLength: number;

  constructor(config: HtmlCopyrightDetectorConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRedirects = config.maxRedirects ?? 5;
    this.maxLength = config.maxLength ?? 200;
  }

  async detect(url: string): Promise<string | undefined> {
    const html = await this.fetchHtml(url);
    if (html === null) {
      log.debug('No usable HTML for copyright detection', { url });
      return undefined;
    }

    const matches = this.copyrightLines(html);
    if (matches.length === 0) {
      log.debug('No copyright line found', { url });
      return undefined;
    }

    // Bottom-up (footer last), prefer the line with a year. Cut from the
    // marker on so CSS/JS wrappers never pollute the stored value.
    const chosen =
      [...matches].reverse().find((match) => match.hasYear) ?? matches.at(-1)!
    const text = this.clean(this.cutAtMarker(chosen.content));
    log.debug('Copyright detection done', { url, copyright: text });
    return text.length > 0 ? text : undefined;
  }

  /** Copyright-bearing text lines, bottom-priority, each flagged with a year.
   *  Tags are replaced by newlines so every text node becomes its own clean
   *  line instead of a tag-polluted run. */
  private copyrightLines(html: string): Array<{ content: string; hasYear: boolean }> {
    const noTags = html.replace(/<[^>]+>/g, '\n');
    const lines: Array<{ content: string; hasYear: boolean }> = [];

    for (const rawLine of noTags.split('\n')) {
      const content = rawLine.trim();
      if (content.length === 0 || isCopyrightPayload(content)) continue;
      if (!COPYRIGHT_RE.test(content)) continue;
      lines.push({ content, hasYear: YEAR_RE.test(content) });
    }

    return lines;
  }

  /** Slices from the first © / &copy; / "copyright" marker to the line end. */
  private cutAtMarker(content: string): string {
    const match = COPYRIGHT_RE.exec(content);
    if (!match || match.index === 0) return content;
    return content.slice(match.index);
  }

  private clean(raw: string): string {
    const decoded = raw
      .replace(/&copy;/gi, '©')
      .replace(/&#169;/gi, '©')
      .replace(/&#xA9;/gi, '©')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#8211;|&#x2013;/gi, '–')
      .replace(/&#8212;|&#x2014;/gi, '—')
      .replace(/&rsquo;|&#8217;|&#039;/gi, "'")
      .replace(/&quot;|&#8220;|&#8221;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();

    return decoded.slice(0, this.maxLength);
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
        log.debug('Fetch failed for copyright detection', {
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
        log.debug('Non-OK response for copyright detection', {
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
        log.debug('Read aborted for copyright detection', {
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
}