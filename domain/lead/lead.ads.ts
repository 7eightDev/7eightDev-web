/**
 * Result of ad-tracking detection on a lead's website. Each flag indicates
 * whether a specific advertising platform's tracker was found in the HTML.
 */
export interface AdsDetectionResult {
  readonly hasGoogleAds: boolean;
  readonly hasMetaPixel: boolean;
  readonly hasGtm: boolean;
}

/**
 * Detects paid-advertising trackers on a website by inspecting its HTML
 * source. Implementations should never throw for unreachable pages — the
 * caller treats a "no ads" result as unknown.
 */
export interface AdsDetectionPort {
  detect(url: string): Promise<AdsDetectionResult>;
}

/** Human-readable tracker labels, one per detected platform. */
export const ADS_TRACKER_LABELS = {
  hasGoogleAds: 'Google Ads',
  hasMetaPixel: 'Meta Pixel',
  hasGtm: 'GTM'
} as const;

/** Maps a detection result to the list of detected tracker names. */
export function adsResultToTrackers(result: AdsDetectionResult): string[] {
  return (
    Object.entries(ADS_TRACKER_LABELS) as Array<
      [keyof AdsDetectionResult, string]
    >
  )
    .filter(([key]) => result[key])
    .map(([, label]) => label);
}
