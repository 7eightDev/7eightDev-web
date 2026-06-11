import type { Money } from "@/domain/shared/money";

/** Target audience tier from the service catalog. */
export type CatalogTier = "web_assets" | "enterprise";

export type PricingModel =
  | { readonly kind: "fixed"; readonly price: Money }
  | { readonly kind: "range"; readonly from: Money; readonly to: Money }
  | { readonly kind: "on_request" };

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
  /** Suggested default when added to a quote. */
  readonly defaultOptional: boolean;
}
