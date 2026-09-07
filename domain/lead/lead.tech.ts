export interface TechStackPort {
  /**
   * Detects the technologies behind a website by fetching its homepage and
   * matching known markers. Returns an empty array when detection fails or
   * nothing recognizable is found. Implementations should never throw for
   * unreachable pages — the caller treats an empty result as "unknown".
   */
  detect(url: string): Promise<string[]>;
}

/**
 * Signature of single technology: matched against the lowercase HTML source.
 * A technology is reported when any of its markers appears.
 */
export interface TechSignature {
  readonly name: string;
  readonly markers: readonly string[];
}