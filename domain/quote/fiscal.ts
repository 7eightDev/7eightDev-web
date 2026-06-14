/**
 * Fiscal regime of a quote — a domain concept, not a presentation detail.
 *
 * - `vat`        → standard invoicing with IVA (vatRate > 0 typically).
 * - `occasional` → prestazione occasionale (art. 67 TUIR): operation *outside
 *   the scope of VAT* (vatRate is always 0) and, when the client acts as a
 *   substitute withholding agent, subject to a 20% ritenuta d'acconto.
 */
export type FiscalRegime = "vat" | "occasional";

/** Ritenuta d'acconto on prestazione occasionale (art. 25 DPR 600/1973). */
export const OCCASIONAL_WITHHOLDING_RATE = 0.2;

/** Marca da bollo threshold (€) above which a €2 stamp is due on the receipt. */
export const BOLLO_THRESHOLD_UNITS = 77.47;

export function isOccasional(regime: FiscalRegime): boolean {
  return regime === "occasional";
}

/**
 * Net the freelancer actually receives under prestazione occasionale, after
 * the client withholds the ritenuta d'acconto. For `vat` the gross is the net.
 * Admin-only figure: never shown on the public quote.
 */
export function netAfterWithholding(
  grossCents: number,
  regime: FiscalRegime
): number {
  if (regime !== "occasional") return grossCents;
  return Math.round(grossCents * (1 - OCCASIONAL_WITHHOLDING_RATE));
}
