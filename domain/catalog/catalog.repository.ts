import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";

/**
 * Port: persistence contract for the Service Catalog.
 * Implementations live in infrastructure/ (Postgres + in-memory for tests).
 * Items are reference data: quotes snapshot them at composition time, so
 * mutating the catalog never affects already-issued quotes.
 */
export interface CatalogRepository {
  /** All items in display order (sortOrder, then title). */
  findAll(): Promise<ServiceCatalogItem[]>;
  findById(id: string): Promise<ServiceCatalogItem | null>;
  /** Create or replace an item by id (idempotent). */
  save(item: ServiceCatalogItem): Promise<void>;
  delete(id: string): Promise<void>;
}
