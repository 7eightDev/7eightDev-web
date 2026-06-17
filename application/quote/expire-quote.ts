import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { canTransition } from "@/domain/quote/quote.status";
import type { Quote } from "@/domain/quote/quote.types";

export type ExpireQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: mark a sent quote as expired (its validity window has lapsed).
 *
 * Terminal transition `sent → expired`, guarded by the validity date: a quote
 * can only be expired once `validUntil` is in the past. While still valid, an
 * unanswered quote stays `sent`; a client "no" is a rejection, not an expiry.
 */
export async function expireQuote(
  repository: QuoteRepository,
  quoteId: string,
  now: Date = new Date()
): Promise<ExpireQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  if (!canTransition(quote.status, "expired")) {
    return {
      ok: false,
      error: `Solo un preventivo inviato può essere segnato come scaduto (stato attuale: ${quote.status}).`,
    };
  }

  if (new Date(quote.validUntil).getTime() >= now.getTime()) {
    return {
      ok: false,
      error:
        "Il preventivo è ancora valido: attendi la scadenza, oppure segnalo come rifiutato.",
    };
  }

  const expired: Quote = { ...quote, status: "expired" };
  await repository.save(expired);
  return { ok: true, quote: expired };
}
