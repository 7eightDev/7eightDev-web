import type { Money } from "@/domain/shared/money";

/** Target audience tier from the service catalog. */
export type CatalogTier = "web_assets" | "enterprise";

export type PricingModel =
  | { readonly kind: "fixed"; readonly price: Money }
  | { readonly kind: "range"; readonly from: Money; readonly to: Money }
  | { readonly kind: "on_request" };

/**
 * How a service is billed. Drives whether the composer adds the item as a
 * one-off line or as a recurring fee — recurring revenue (e.g. maintenance)
 * must never silently collapse into a one-time charge.
 */
export type BillingModel =
  | { readonly kind: "one_time" }
  | { readonly kind: "recurring"; readonly interval: "monthly" | "yearly" }
  /**
   * On-demand work ("interventi a chiamata"): composed into the quote as an
   * `on_demand` line item — priced as a starting base but never part of any
   * total. Carries no interval.
   */
  | { readonly kind: "on_demand" };

/**
 * A composable service from the 7eightDev catalog.
 * Quotes snapshot these values into line items at composition time —
 * catalog changes never affect already-issued quotes.
 */
export interface ServiceCatalogItem {
  readonly id: string;
  readonly tier: CatalogTier;
  readonly title: string;
  readonly description: string;
  readonly pricing: PricingModel;
  /** One-time by default; recurring items carry their billing interval. */
  readonly billing: BillingModel;
  /** Suggested default when added to a quote. */
  readonly defaultOptional: boolean;
  /** Position in the catalog; lower comes first. Drives display order. */
  readonly sortOrder: number;
}
