"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createQuote } from "@/application/quote/create-quote";
import { sendQuote } from "@/application/quote/send-quote";
import { quoteRepository } from "@/infrastructure/container";

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

/** Server action: transition draft → sent. */
export async function sendQuoteAction(
  quoteId: string
): Promise<AdminActionResult> {
  const result = await sendQuote(quoteRepository, quoteId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/quotes");
  return { ok: true };
}
