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