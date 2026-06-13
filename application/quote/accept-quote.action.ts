"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { acceptQuote } from "@/application/quote/accept-quote";
import { quoteNotifier, quoteRepository } from "@/infrastructure/container";

export interface AcceptQuoteActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * Server action: transport adapter for the acceptQuote use case.
 * This file is the composition point where infrastructure is wired in.
 */
export async function acceptQuoteAction(
  quoteId: string,
  acceptedByName: string,
  selectedOptionalIds: readonly string[]
): Promise<AcceptQuoteActionResult> {
  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const result = await acceptQuote(quoteRepository, quoteNotifier, {
    quoteId,
    acceptedByName,
    selectedOptionalIds,
    ipAddress,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Bust the cached views so the new "accepted" status is consistent
  // everywhere: the admin list and the public quote page (which otherwise
  // serves an optimistic/stale render).
  revalidatePath("/admin/quotes");
  revalidatePath(`/p/${quoteId}`);

  return { ok: true };
}
