import type { CatalogItemInput } from "@/application/catalog/catalog.schemas";
import type {
  BillingModel,
  PricingModel,
  ServiceCatalogItem,
} from "@/domain/catalog/catalog.types";
import { moneyFromUnits } from "@/domain/shared/money";

function buildPricing(input: CatalogItemInput["pricing"]): PricingModel {
  switch (input.kind) {
    case "fixed":
      return { kind: "fixed", price: moneyFromUnits(input.priceUnits) };
    case "range":
      return {
        kind: "range",
        from: moneyFromUnits(input.fromUnits),
        to: moneyFromUnits(input.toUnits),
      };
    case "on_request":
      return { kind: "on_request" };
  }
}

function buildBilling(input: CatalogItemInput["billing"]): BillingModel {
  switch (input.kind) {
    case "recurring":
      return { kind: "recurring", interval: input.interval };
    case "on_demand":
      return { kind: "on_demand" };
    case "one_time":
      return { kind: "one_time" };
  }
}

/** Assembles the domain model from validated form input. */
export function buildCatalogItem(
  id: string,
  input: CatalogItemInput,
  sortOrder: number
): ServiceCatalogItem {
  return {
    id,
    tier: input.tier,
    title: input.title,
    description: input.description,
    pricing: buildPricing(input.pricing),
    billing: buildBilling(input.billing),
    defaultOptional: input.defaultOptional,
    sortOrder,
  };
}
