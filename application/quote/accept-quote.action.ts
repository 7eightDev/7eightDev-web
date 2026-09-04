"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { acceptQuote } from "@/application/quote/accept-quote";
import { quoteNotifier, quoteRepository } from "@/infrastructure/container";

export interface AcceptQuoteActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

const acceptQuoteInputSchema = z.object({
  quoteId: z.string().uuid("Id preventivo non valido"),
  acceptedByName: z
    .string()
    .min(1, "Nome obbligatorio")
    .max(200, "Nome troppo lungo"),
  selectedOptionalIds: z.array(z.string().uuid()),
});

/**
 * Server action: transport adapter for the acceptQuote use case.
 * This file is the composition point where infrastructure is wired in.
 */
export async function acceptQuoteAction(
  quoteId: string,
  acceptedByName: string,
  selectedOptionalIds: readonly string[]
): Promise<AcceptQuoteActionResult> {
  const parsed = acceptQuoteInputSchema.safeParse({
    quoteId,
    acceptedByName,
    selectedOptionalIds,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const result = await acceptQuote(quoteRepository, quoteNotifier, {
    quoteId: parsed.data.quoteId,
    acceptedByName: parsed.data.acceptedByName,
    selectedOptionalIds: parsed.data.selectedOptionalIds,
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
