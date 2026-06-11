"use server";

import { headers } from "next/headers";
import { acceptQuote } from "@/application/quote/accept-quote";
import { quoteRepository } from "@/infrastructure/container";

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

  const result = await acceptQuote(quoteRepository, {
    quoteId,
    acceptedByName,
    selectedOptionalIds,
    ipAddress,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
