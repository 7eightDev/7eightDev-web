import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { canTransition } from "@/domain/quote/quote.status";
import type { Quote } from "@/domain/quote/quote.types";

export type SendQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/** Use case: mark a draft quote as sent (the public link becomes "live"). */
export async function sendQuote(
  repository: QuoteRepository,
  quoteId: string
): Promise<SendQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  if (!canTransition(quote.status, "sent")) {
    return {
      ok: false,
      error: `Il preventivo non è inviabile (stato: ${quote.status}).`,
    };
  }

  const sent: Quote = { ...quote, status: "sent" };
  await repository.save(sent);
  return { ok: true, quote: sent };
}
