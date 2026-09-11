/**
 * LCP/FCP are canonical in SECONDS across the domain, report and email layers
 * (thresholds like `≤ 2.5 s` and the impact model compare seconds). The
 * PageSpeed Insights API, however, ships time metrics in milliseconds, and
 * analyses captured before this normalization were persisted as-is (ms).
 *
 * This maps both paths to the canonical unit. Anything ≥ 100 is unambiguous —
 * a real (or fixture) LCP/FCP is 0.2s–20s — so `≥ 100` means "milliseconds"
 * and is divided by 1000. Idempotent: seconds values pass through unchanged.
 */
export function timeMetricToSeconds(
  value: number | null | undefined
): number | null | undefined {
  if (value === null || value === undefined) return value;
  if (value < 100) return value;
  // Round to 4 decimals so ms→s stays deterministic (2450.2/1000 = 2.450199…).
  return Math.round((value / 1000) * 10_000) / 10_000;
}