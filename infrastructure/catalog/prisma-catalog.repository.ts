import type { CatalogRepository } from "@/domain/catalog/catalog.repository";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import { prisma } from "@/infrastructure/db/prisma";
import {
  type CatalogItemRow,
  catalogItemToRow,
  rowToCatalogItem,
} from "@/infrastructure/catalog/catalog.mapper";

/** Adapter: Postgres implementation of the CatalogRepository port. */
export class PrismaCatalogRepository implements CatalogRepository {
  async findAll(): Promise<ServiceCatalogItem[]> {
    const rows = await prisma.catalogItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map((row) => rowToCatalogItem(row as unknown as CatalogItemRow));
  }

  async findById(id: string): Promise<ServiceCatalogItem | null> {
    const row = await prisma.catalogItem.findUnique({ where: { id } });
    return row ? rowToCatalogItem(row as unknown as CatalogItemRow) : null;
  }

  async save(item: ServiceCatalogItem): Promise<void> {
    const row = catalogItemToRow(item);
    const data = {
      tier: row.tier,
      title: row.title,
      description: row.description,
      pricingKind: row.pricingKind,
      currency: row.currency,
      priceCents: row.priceCents,
      fromCents: row.fromCents,
      toCents: row.toCents,
      billingKind: row.billingKind,
      billingInterval: row.billingInterval,
      defaultOptional: row.defaultOptional,
      sortOrder: row.sortOrder,
    };
    await prisma.catalogItem.upsert({
      where: { id: row.id },
      create: { id: row.id, ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.catalogItem.delete({ where: { id } });
  }
}
