import type { LeadAnalysis } from "@/domain/lead/lead.types";

/**
 * Economic-impact estimate for a slow website.
 *
 * Purpose: the value-first outreach report needs a number it can show to a
 * prospect — "with €1.000/month of Google Ads budget, a site as slow as yours
 * wastes roughly €X". The model deliberately uses a single, transparent,
 * industry-cited input so the number stays defensible in a first contact:
 *
 *   conversion loss ≃ 20% per second of LCP beyond the "good" threshold (2.5s),
 *   capped at 80%.
 *
 * Sources for the order of magnitude: Google/SOASTA research on mobile speed
 * and conversion (a 1s delay measurably hurts conversions), Google's LCP
 * "good" bound of 2.5s. The result is clearly labeled as an estimate in the
 * report — never a fabricated metric.
 */

/** LCP below this is considered "good" by Google, penalty = 0. */
export const CWV_LCP_GOOD_SECONDS = 2.5;

/** Conversion penalty applied per second of LCP above the good threshold. */
export const SECOND_OF_DELAY_CONVERSION_PENALTY = 0.2;

/** Cap so the estimate never claims more than 80% of the ad budget is wasted. */
export const MAX_CONVERSION_PENALTY = 0.8;

/** Assumed monthly ad budgets shown as a scenario table in the report. */
export const AD_BUDGET_SCENARIOS_EUR = [500, 1000, 2000] as const;

/**
 * Fraction (0..1) of an ad budget that a site as slow as this lead converts
 * away. Falls back to FCP when LCP is missing; 0 when nothing is known.
 */
export function conversionLossRate(analysis: LeadAnalysis): number {
  const delayBasis =
    analysis.lcp ?? analysis.fcp ?? CWV_LCP_GOOD_SECONDS;
  if (delayBasis <= CWV_LCP_GOOD_SECONDS) return 0;
  const penalty =
    (delayBasis - CWV_LCP_GOOD_SECONDS) * SECOND_OF_DELAY_CONVERSION_PENALTY;
  return Math.min(MAX_CONVERSION_PENALTY, penalty);
}

/** Round monthly "wasted" ad budget for a given spend, based on the loss rate. */
export function estMonthlyAdWaste(
  lossRate: number,
  monthlyBudgetEur: number
): number {
  return Math.round(lossRate * monthlyBudgetEur);
}

/** Whole-euro formatted value, e.g. `350 €`. */
export function formatEur(value: number): string {
  return `${value} €`;
}