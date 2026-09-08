import type { Lead } from '@/domain/lead/lead.types';

export interface CopyrightPort {
  /**
   * Extracts the footer copyright line from a website's homepage, e.g.
   * "© 2019 Studio Rossi". Returns the cleaned text when found, undefined
   * otherwise. Implementations should never throw for unreachable pages — the
   * caller treats an undefined result as "unknown".
   */
  detect(url: string): Promise<string | undefined>;
}

/** Any line this long is a bundled resource, not a footer line. */
export const MAX_COPYRIGHT_LINE_LENGTH = 300;

/** True when the text looks like a JS/CSS payload (RSC flight data, React
 *  state blobs, `<style>` content, code comments) rather than a copyright
 *  footer line. Guards both detection and what is shown to the admin. */
export function isCopyrightPayload(text: string | null | undefined): boolean {
  const value = text?.trim() ?? '';
  if (value.length === 0) return true;
  if (value.length > MAX_COPYRIGHT_LINE_LENGTH) return true;
  if (/[{}[\]]|=>|"|`/.test(value)) return true;
  if (/^(?:\/\/|\/\*|\*|\#|\[\[|self\.__|window\.|document\.)/.test(value)) {
    return true;
  }
  if (/\b(function|return|const|let|var|require|import)\b/.test(value)) {
    return true;
  }
  return false;
}

/** First 4-digit year found in a footer copyright text, if any. */
export function extractCopyrightYear(
  text: string | null | undefined
): number | undefined {
  if (!text) return undefined;
  const match = /\b(?:19|20)\d{2}\b/.exec(text);
  return match ? Number(match[0]) : undefined;
}

/**
 * True when a lead's footer year falls inside an inclusive from/to range.
 * Leads without a detectable year never match an active range.
 */
export function leadMatchesYearRange(
  lead: Lead,
  from: number | undefined,
  to: number | undefined
): boolean {
  if (from === undefined && to === undefined) return true;
  const year = extractCopyrightYear(lead.copyright);
  if (year === undefined) return false;
  if (from !== undefined && year < from) return false;
  if (to !== undefined && year > to) return false;
  return true;
}