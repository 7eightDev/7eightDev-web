"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createQuote } from "@/application/quote/create-quote";
import { updateQuote } from "@/application/quote/update-quote";
import { sendQuote } from "@/application/quote/send-quote";
import { archiveQuote, unarchiveQuote } from "@/application/quote/archive-quote";
import { deleteQuote } from "@/application/quote/delete-quote";
import { rejectQuote } from "@/application/quote/reject-quote";
import { expireQuote } from "@/application/quote/expire-quote";
import { quoteNotifier, quoteRepository } from "@/infrastructure/container";

export interface AdminActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

/** Server action: create a draft quote from the composer form. */
export async function createQuoteAction(
  rawInput: unknown
): Promise<AdminActionResult> {
  const result = await createQuote({ repository: quoteRepository }, rawInput);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  redirect("/admin/quotes");
}

/** Server action: save edits to a draft quote, then return to the list. */
export async function updateQuoteAction(
  quoteId: string,
  rawInput: unknown
): Promise<AdminActionResult> {
  const result = await updateQuote({ repository: quoteRepository }, quoteId, rawInput);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}/edit`);
  redirect("/admin/quotes");
}

/** Server action: transition draft → sent. */
export async function sendQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await sendQuote(quoteRepository, quoteNotifier, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}

/** Server action: archive a quote (hide from the default list, keep history). */
export async function archiveQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await archiveQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}

/** Server action: restore an archived quote back into the active list. */
export async function unarchiveQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await unarchiveQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}

/** Server action: permanently delete a quote (drafts only; enforced in the use case). */
export async function deleteQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await deleteQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}

/** Server action: transition sent → rejected (client declined). */
export async function rejectQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await rejectQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}

/** Server action: transition sent → expired (validity lapsed; enforced in the use case). */
export async function expireQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await expireQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}
