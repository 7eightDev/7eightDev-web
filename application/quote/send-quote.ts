import type { QuoteNotificationPort } from "@/domain/quote/quote-notification.port";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { canTransition } from "@/domain/quote/quote.status";
import type { Quote } from "@/domain/quote/quote.types";

export type SendQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: send a draft quote to its client.
 *
 * The email goes out *first*: the quote is flipped to `sent` only after the
 * notifier confirms delivery, so the "sent" status always means the client was
 * actually notified, and a failed send leaves the quote a re-sendable draft.
 */
export async function sendQuote(
  repository: QuoteRepository,
  notifier: QuoteNotificationPort,
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

  if (!quote.client.email?.trim()) {
    return {
      ok: false,
      error: "Aggiungi un'email cliente al preventivo per poterlo inviare.",
    };
  }

  const notification = await notifier.notifyQuoteSent(quote);
  if (!notification.ok) {
    return {
      ok: false,
      error: `Invio email non riuscito: ${notification.error}`,
    };
  }

  const sent: Quote = { ...quote, status: "sent" };
  await repository.save(sent);
  return { ok: true, quote: sent };
}
