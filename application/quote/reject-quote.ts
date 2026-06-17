import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { canTransition } from "@/domain/quote/quote.status";
import type { Quote } from "@/domain/quote/quote.types";

export type RejectQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: mark a sent quote as rejected (the client declined).
 *
 * Terminal transition `sent → rejected`. Distinct from expiry: a rejection is
 * an explicit "no" from the client and can happen while the quote is still
 * within its validity window.
 */
export async function rejectQuote(
  repository: QuoteRepository,
  quoteId: string
): Promise<RejectQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  if (!canTransition(quote.status, "rejected")) {
    return {
      ok: false,
      error: `Solo un preventivo inviato può essere rifiutato (stato attuale: ${quote.status}).`,
    };
  }

  const rejected: Quote = { ...quote, status: "rejected" };
  await repository.save(rejected);
  return { ok: true, quote: rejected };
}
