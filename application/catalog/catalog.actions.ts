"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
} from "@/application/catalog/catalog-admin";
import { catalogRepository } from "@/infrastructure/container";

export interface CatalogActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

/** Server action: create a catalog item, then return to the catalog list. */
export async function createCatalogItemAction(
  id: string,
  rawInput: unknown
): Promise<CatalogActionResult> {
  const result = await createCatalogItem({ repository: catalogRepository }, id, rawInput);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/catalog");
  redirect("/admin/catalog");
}

/** Server action: save edits to a catalog item, then return to the list. */
export async function updateCatalogItemAction(
  id: string,
  rawInput: unknown
): Promise<CatalogActionResult> {
  const result = await updateCatalogItem({ repository: catalogRepository }, id, rawInput);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${id}/edit`);
  redirect("/admin/catalog");
}

/** Server action: delete a catalog item. Stays on the list (no redirect). */
export async function deleteCatalogItemAction(
  id: string
): Promise<CatalogActionResult> {
  const result = await deleteCatalogItem({ repository: catalogRepository }, id);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/catalog");
  return { ok: true };
}
