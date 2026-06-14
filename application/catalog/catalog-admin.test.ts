import {
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
} from "@/application/catalog/catalog-admin";
import type { CatalogItemInput } from "@/application/catalog/catalog.schemas";
import { InMemoryCatalogRepository } from "@/infrastructure/catalog/in-memory-catalog.repository";

function makeRepo(seed = []) {
  return new InMemoryCatalogRepository(seed);
}

const fixedInput: CatalogItemInput = {
  tier: "web_assets",
  title: "Landing",
  description: "A landing page.",
  pricing: { kind: "fixed", priceUnits: 2500 },
  billing: { kind: "one_time" },
  defaultOptional: false,
};

describe("createCatalogItem", () => {
  it("creates an item and converts euros to cents", async () => {
    const repo = makeRepo();
    const result = await createCatalogItem({ repository: repo }, "landing", fixedInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe("landing");
    expect(result.item.pricing).toEqual({
      kind: "fixed",
      price: { amountCents: 250000, currency: "EUR" },
    });
    expect(await repo.findById("landing")).not.toBeNull();
  });

  it("appends new items at the end via sortOrder", async () => {
    const repo = makeRepo();
    await createCatalogItem({ repository: repo }, "first", fixedInput);
    const second = await createCatalogItem({ repository: repo }, "second", fixedInput);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.item.sortOrder).toBe(1);
  });

  it("rejects a duplicate id", async () => {
    const repo = makeRepo();
    await createCatalogItem({ repository: repo }, "landing", fixedInput);
    const dup = await createCatalogItem({ repository: repo }, "landing", fixedInput);

    expect(dup.ok).toBe(false);
    if (dup.ok) return;
    expect(dup.error).toMatch(/già/);
  });

  it("rejects a non-slug id", async () => {
    const repo = makeRepo();
    const result = await createCatalogItem({ repository: repo }, "Not A Slug", fixedInput);
    expect(result.ok).toBe(false);
  });

  it("rejects a range whose max is below its min", async () => {
    const repo = makeRepo();
    const result = await createCatalogItem({ repository: repo }, "ranged", {
      ...fixedInput,
      pricing: { kind: "range", fromUnits: 900, toUnits: 100 },
    });
    expect(result.ok).toBe(false);
  });
});

describe("updateCatalogItem", () => {
  it("updates an existing item and preserves its sortOrder", async () => {
    const repo = makeRepo();
    const created = await createCatalogItem({ repository: repo }, "landing", fixedInput);
    if (!created.ok) throw new Error("setup failed");

    const result = await updateCatalogItem({ repository: repo }, "landing", {
      ...fixedInput,
      title: "Landing rinnovata",
      pricing: { kind: "on_request" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.title).toBe("Landing rinnovata");
    expect(result.item.pricing).toEqual({ kind: "on_request" });
    expect(result.item.sortOrder).toBe(created.item.sortOrder);
  });

  it("fails when the item does not exist", async () => {
    const repo = makeRepo();
    const result = await updateCatalogItem({ repository: repo }, "ghost", fixedInput);
    expect(result.ok).toBe(false);
  });
});

describe("deleteCatalogItem", () => {
  it("deletes an existing item", async () => {
    const repo = makeRepo();
    await createCatalogItem({ repository: repo }, "landing", fixedInput);
    const result = await deleteCatalogItem({ repository: repo }, "landing");

    expect(result.ok).toBe(true);
    expect(await repo.findById("landing")).toBeNull();
  });

  it("fails when the item does not exist", async () => {
    const repo = makeRepo();
    const result = await deleteCatalogItem({ repository: repo }, "ghost");
    expect(result.ok).toBe(false);
  });
});
