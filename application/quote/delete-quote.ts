import type { QuoteRepository } from "@/domain/quote/quote.repository";

export type DeleteQuoteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: permanently delete a quote.
 *
 * Hard deletion is restricted to `draft` quotes. Once a quote has been sent it
 * is a commercial record (a client has seen it, it may have been accepted or
 * rejected): destroying it irreversibly would lose history, so non-drafts must
 * be archived instead. This guard is the authoritative rule; the UI mirrors it.
 */
export async function deleteQuote(
  repository: QuoteRepository,
  quoteId: string
): Promise<DeleteQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  if (quote.status !== "draft") {
    return {
      ok: false,
      error:
        "Solo le bozze possono essere eliminate. Archivia il preventivo per rimuoverlo dalla lista mantenendone lo storico.",
    };
  }

  await repository.delete(quoteId);
  return { ok: true };
}
