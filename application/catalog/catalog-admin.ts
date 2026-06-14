import { buildCatalogItem } from "@/application/catalog/catalog-builders";
import {
  catalogIdSchema,
  catalogItemInputSchema,
} from "@/application/catalog/catalog.schemas";
import type { CatalogRepository } from "@/domain/catalog/catalog.repository";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";

export type CatalogAdminResult =
  | { readonly ok: true; readonly item: ServiceCatalogItem }
  | { readonly ok: false; readonly error: string };

export type CatalogDeleteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

interface CatalogAdminDeps {
  readonly repository: CatalogRepository;
}

function parseInput(rawInput: unknown) {
  const parsed = catalogItemInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false as const,
      error: `${first.path.join(".")}: ${first.message}`,
    };
  }
  return { ok: true as const, input: parsed.data };
}

/** Next free position so a new item lands at the end of the catalog. */
async function nextSortOrder(repository: CatalogRepository): Promise<number> {
  const items = await repository.findAll();
  return items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
}

/** Use case: create a new catalog item. Fails if the id is already taken. */
export async function createCatalogItem(
  deps: CatalogAdminDeps,
  rawId: unknown,
  rawInput: unknown
): Promise<CatalogAdminResult> {
  const id = catalogIdSchema.safeParse(rawId);
  if (!id.success) {
    return { ok: false, error: id.error.issues[0].message };
  }
  const parsed = parseInput(rawInput);
  if (!parsed.ok) return parsed;

  const existing = await deps.repository.findById(id.data);
  if (existing) {
    return { ok: false, error: `Esiste già una voce con id "${id.data}".` };
  }

  const sortOrder = parsed.input.sortOrder ?? (await nextSortOrder(deps.repository));
  const item = buildCatalogItem(id.data, parsed.input, sortOrder);
  await deps.repository.save(item);
  return { ok: true, item };
}

/**
 * Use case: update an existing catalog item. The id is immutable (it's the
 * stable reference quotes may carry); changing it means delete + create.
 */
export async function updateCatalogItem(
  deps: CatalogAdminDeps,
  id: string,
  rawInput: unknown
): Promise<CatalogAdminResult> {
  const parsed = parseInput(rawInput);
  if (!parsed.ok) return parsed;

  const existing = await deps.repository.findById(id);
  if (!existing) return { ok: false, error: "Voce di catalogo non trovata." };

  const sortOrder = parsed.input.sortOrder ?? existing.sortOrder;
  const item = buildCatalogItem(id, parsed.input, sortOrder);
  await deps.repository.save(item);
  return { ok: true, item };
}

/** Use case: delete a catalog item. Issued quotes are unaffected (snapshot). */
export async function deleteCatalogItem(
  deps: CatalogAdminDeps,
  id: string
): Promise<CatalogDeleteResult> {
  const existing = await deps.repository.findById(id);
  if (!existing) return { ok: false, error: "Voce di catalogo non trovata." };
  await deps.repository.delete(id);
  return { ok: true };
}
