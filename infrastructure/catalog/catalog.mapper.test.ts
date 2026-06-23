import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import { moneyFromUnits } from "@/domain/shared/money";
import {
  type CatalogItemRow,
  catalogItemToRow,
  rowToCatalogItem,
} from "@/infrastructure/catalog/catalog.mapper";
import { CATALOG_SEED } from "@/infrastructure/catalog/catalog.seed";

const fixedItem: ServiceCatalogItem = {
  id: "fixed-item",
  tier: "web_assets",
  title: "Fixed",
  description: "A fixed-price service.",
  pricing: { kind: "fixed", price: moneyFromUnits(2500) },
  billing: { kind: "one_time" },
  defaultOptional: false,
  sortOrder: 0,
};

const rangeRecurringItem: ServiceCatalogItem = {
  id: "range-item",
  tier: "enterprise",
  title: "Range",
  description: "A ranged, recurring service.",
  pricing: { kind: "range", from: moneyFromUnits(100), to: moneyFromUnits(900) },
  billing: { kind: "recurring", interval: "monthly" },
  defaultOptional: true,
  sortOrder: 3,
};

const onRequestItem: ServiceCatalogItem = {
  id: "on-request-item",
  tier: "enterprise",
  title: "On request",
  description: "Priced on request.",
  pricing: { kind: "on_request" },
  billing: { kind: "one_time" },
  defaultOptional: false,
  sortOrder: 7,
};

const onDemandItem: ServiceCatalogItem = {
  id: "on-demand-item",
  tier: "web_assets",
  title: "On demand",
  description: "On-call work, priced from a starting base.",
  pricing: { kind: "fixed", price: moneyFromUnits(50) },
  billing: { kind: "on_demand" },
  defaultOptional: false,
  sortOrder: 9,
};

describe("Catalog mapper", () => {
  it.each([fixedItem, rangeRecurringItem, onRequestItem, onDemandItem])(
    "round-trips %# without losing information",
    (item) => {
      expect(rowToCatalogItem(catalogItemToRow(item))).toEqual(item);
    }
  );

  it("nulls the interval for on_demand billing", () => {
    const row = catalogItemToRow(onDemandItem);
    expect(row.billingKind).toBe("on_demand");
    expect(row.billingInterval).toBeNull();
  });

  it("flattens a fixed price into priceCents and nulls the range columns", () => {
    const row = catalogItemToRow(fixedItem);
    expect(row.pricingKind).toBe("fixed");
    expect(row.priceCents).toBe(250000);
    expect(row.fromCents).toBeNull();
    expect(row.toCents).toBeNull();
  });

  it("flattens a range into from/to and nulls priceCents", () => {
    const row = catalogItemToRow(rangeRecurringItem);
    expect(row.pricingKind).toBe("range");
    expect(row.priceCents).toBeNull();
    expect(row.fromCents).toBe(10000);
    expect(row.toCents).toBe(90000);
  });

  it("nulls every amount column for on_request", () => {
    const row = catalogItemToRow(onRequestItem);
    expect(row.pricingKind).toBe("on_request");
    expect(row.priceCents).toBeNull();
    expect(row.fromCents).toBeNull();
    expect(row.toCents).toBeNull();
  });

  it("maps billingInterval only for recurring items", () => {
    expect(catalogItemToRow(fixedItem).billingInterval).toBeNull();
    expect(catalogItemToRow(rangeRecurringItem).billingInterval).toBe("monthly");
  });

  it("rejects a row whose columns violate the discriminated union", () => {
    const corrupt: CatalogItemRow = {
      ...catalogItemToRow(fixedItem),
      pricingKind: "fixed",
      priceCents: null, // a fixed item must carry a price
    };
    expect(() => rowToCatalogItem(corrupt)).toThrow();
  });

  it("maps every seed item through the mapper without throwing", () => {
    for (const item of CATALOG_SEED) {
      expect(rowToCatalogItem(catalogItemToRow(item))).toEqual(item);
    }
  });
});
