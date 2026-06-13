import type { Money } from "@/domain/shared/money";

/* ----------------------------- Status ----------------------------- */

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

/* --------------------------- Line items --------------------------- */

export type RecurringInterval = "monthly" | "yearly";

interface BaseLineItem {
  readonly id: string;
  /**
   * Reference to the catalog item this was composed from, if any.
   * Informational only (analytics): title/description/price are
   * snapshotted into the line item and never re-read from the catalog.
   */
  readonly catalogRef?: string;
  readonly title: string;
  readonly description: string;
  readonly unitPrice: Money;
  /**
   * Number of units billed at unitPrice (e.g. 5 pages, 20 hours, 12 months).
   * Optional for backward-compat with snapshots predating quantities;
   * absent means 1. The line total is always unitPrice × quantity.
   */
  readonly quantity?: number;
  /** Optional unit label shown next to the quantity (e.g. "pagina", "ora"). */
  readonly unit?: string;
  /**
   * Optional items can be toggled by the client on the public quote page.
   * Non-optional items are always included in the total.
   * The client's final selection is captured in AcceptanceRecord.
   */
  readonly optional: boolean;
}

export type LineItem =
  | (BaseLineItem & { readonly type: "one_time" })
  | (BaseLineItem & {
      readonly type: "recurring";
      readonly interval: RecurringInterval;
    });

/* ----------------------------- Quote ------------------------------ */

export interface ClientInfo {
  readonly name: string;
  readonly company?: string;
  readonly email?: string;
}

export interface ProjectPhase {
  readonly title: string;
  readonly weeks: string;
}

/** Technical stack shown on the public quote page as a quality marker. */
export interface TechStackEntry {
  readonly label: string;
  readonly technology: string;
}

/** Per-quote contractual terms shown on the public page (e.g. payment plan). */
export interface QuoteTerm {
  readonly label: string;
  readonly body: string;
}

/**
 * A commercial discount applied to the one-time net subtotal (before VAT).
 * `percent` is a fraction in [0, 1]; `fixed` is capped at the subtotal so a
 * quote total can never go negative.
 */
export type Discount =
  | { readonly kind: "percent"; readonly value: number }
  | { readonly kind: "fixed"; readonly amount: Money };

export interface QuoteMetadata {
  readonly phases?: readonly ProjectPhase[];
  readonly timelineNote?: string;
  readonly techStack?: readonly TechStackEntry[];
  readonly terms?: readonly QuoteTerm[];
  /**
   * Optional commercial discount. Snapshotted with the quote (carried in the
   * persisted metadata JSON) so re-pricing the catalog never alters it.
   */
  readonly discount?: Discount;
}

export interface AcceptanceRecord {
  readonly acceptedByName: string;
  readonly acceptedAt: string; // ISO 8601
  readonly ipAddress?: string;
  /** Snapshot of which optional line items the client selected. */
  readonly selectedOptionalIds: readonly string[];
}

export interface Quote {
  readonly id: string; // UUID — also the public URL token (/p/[uuid])
  readonly number: string; // human-readable, e.g. "2026-001"
  readonly status: QuoteStatus;
  readonly client: ClientInfo;
  readonly project: string;
  readonly intro: string;
  readonly issuedAt: string; // ISO 8601
  readonly validUntil: string; // ISO 8601
  readonly vatRate: number; // e.g. 0.22
  readonly lineItems: readonly LineItem[];
  readonly metadata: QuoteMetadata;
  readonly acceptance?: AcceptanceRecord;
}

/* --------------------------- Calculation -------------------------- */

export interface QuoteCalculation {
  /** Net total of included one-time items, before any discount. */
  readonly oneTimeSubtotal: Money;
  /** Discount amount deducted from the one-time subtotal (0 if none). */
  readonly discount: Money;
  /** One-time net after discount (subtotal − discount). VAT is computed on this. */
  readonly oneTimeNet: Money;
  readonly vat: Money;
  /** Gross one-time total (net after discount + VAT). */
  readonly oneTimeTotal: Money;
  /** Net recurring totals of included recurring items, per interval. */
  readonly monthlyRecurring: Money;
  readonly yearlyRecurring: Money;
}
