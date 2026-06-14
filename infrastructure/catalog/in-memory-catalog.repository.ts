import type { CatalogRepository } from "@/domain/catalog/catalog.repository";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";

/**
 * Adapter: in-memory CatalogRepository for tests and local demos without a DB.
 * Ordering mirrors the Postgres adapter (sortOrder, then title).
 */
export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly store = new Map<string, ServiceCatalogItem>();

  constructor(seed: readonly ServiceCatalogItem[] = []) {
    for (const item of seed) this.store.set(item.id, item);
  }

  async findAll(): Promise<ServiceCatalogItem[]> {
    return [...this.store.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
    );
  }

  async findById(id: string): Promise<ServiceCatalogItem | null> {
    return this.store.get(id) ?? null;
  }

  async save(item: ServiceCatalogItem): Promise<void> {
    this.store.set(item.id, item);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
