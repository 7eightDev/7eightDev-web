import { catalogItemSchema } from "@/domain/catalog/catalog.schema";
import type {
  BillingModel,
  CatalogTier,
  PricingModel,
  ServiceCatalogItem,
} from "@/domain/catalog/catalog.types";
import type { Currency, Money } from "@/domain/shared/money";

type PricingKind = "fixed" | "range" | "on_request";
type BillingKind = "one_time" | "recurring";
type BillingInterval = "monthly" | "yearly";

/**
 * Structural row type matching the `catalog_items` table. Declared
 * structurally (not from the generated client) so the mapper stays
 * unit-testable without codegen and independent of Prisma.
 */
export interface CatalogItemRow {
  id: string;
  tier: CatalogTier;
  title: string;
  description: string;
  pricingKind: PricingKind;
  currency: string;
  priceCents: number | null;
  fromCents: number | null;
  toCents: number | null;
  billingKind: BillingKind;
  billingInterval: BillingInterval | null;
  defaultOptional: boolean;
  sortOrder: number;
}

function money(amountCents: number, currency: Currency): Money {
  return { amountCents, currency };
}

/** Asserts a discriminant-required column is present (CHECK guarantees it). */
function required(value: number | null, field: keyof CatalogItemRow): number {
  if (value === null) {
    throw new Error(`catalog row is corrupt: "${field}" must not be null`);
  }
  return value;
}

function rowToPricing(row: CatalogItemRow): PricingModel {
  const currency = row.currency as Currency;
  switch (row.pricingKind) {
    case "fixed":
      return {
        kind: "fixed",
        price: money(required(row.priceCents, "priceCents"), currency),
      };
    case "range":
      return {
        kind: "range",
        from: money(required(row.fromCents, "fromCents"), currency),
        to: money(required(row.toCents, "toCents"), currency),
      };
    case "on_request":
      return { kind: "on_request" };
  }
}

function rowToBilling(row: CatalogItemRow): BillingModel {
  return row.billingKind === "recurring"
    ? { kind: "recurring", interval: row.billingInterval ?? "monthly" }
    : { kind: "one_time" };
}

/**
 * Maps a DB row to the domain model and validates the result. CHECK
 * constraints guard coherence at write time; this parse is defence in depth
 * and surfaces any drift as a typed error rather than a malformed object.
 */
export function rowToCatalogItem(row: CatalogItemRow): ServiceCatalogItem {
  return catalogItemSchema.parse({
    id: row.id,
    tier: row.tier,
    title: row.title,
    description: row.description,
    pricing: rowToPricing(row),
    billing: rowToBilling(row),
    defaultOptional: row.defaultOptional,
    sortOrder: row.sortOrder,
  });
}

/** Flattens the domain model into the relational row shape. */
export function catalogItemToRow(item: ServiceCatalogItem): CatalogItemRow {
  const pricing = item.pricing;
  const billing = item.billing;

  const currency =
    pricing.kind === "fixed"
      ? pricing.price.currency
      : pricing.kind === "range"
        ? pricing.from.currency
        : "EUR";

  return {
    id: item.id,
    tier: item.tier,
    title: item.title,
    description: item.description,
    pricingKind: pricing.kind,
    currency,
    priceCents: pricing.kind === "fixed" ? pricing.price.amountCents : null,
    fromCents: pricing.kind === "range" ? pricing.from.amountCents : null,
    toCents: pricing.kind === "range" ? pricing.to.amountCents : null,
    billingKind: billing.kind,
    billingInterval: billing.kind === "recurring" ? billing.interval : null,
    defaultOptional: item.defaultOptional,
    sortOrder: item.sortOrder,
  };
}
