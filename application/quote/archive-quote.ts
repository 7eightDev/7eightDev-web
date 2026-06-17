import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";

export type ArchiveQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: archive a quote.
 *
 * Archiving is orthogonal to the lifecycle `status`: it only sets `archivedAt`,
 * so the original status is preserved and the quote can be unarchived later.
 * Idempotent — re-archiving an already archived quote is a no-op success.
 */
export async function archiveQuote(
  repository: QuoteRepository,
  quoteId: string,
  now: Date = new Date()
): Promise<ArchiveQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  // A sent quote is awaiting the client's answer — archiving it would hide a
  // live deal. It must first reach a closed state (rejected/expired), or be
  // accepted, before it can be archived.
  if (quote.status === "sent") {
    return {
      ok: false,
      error:
        "Un preventivo inviato non può essere archiviato: è in attesa di risposta. Segnalo come rifiutato o scaduto quando la trattativa si chiude.",
    };
  }

  if (quote.archivedAt) return { ok: true, quote };

  const archived: Quote = { ...quote, archivedAt: now.toISOString() };
  await repository.save(archived);
  return { ok: true, quote: archived };
}

/**
 * Use case: restore an archived quote back into the active list. The quote
 * returns to whatever lifecycle status it held — archiving never touched it.
 * Idempotent — unarchiving an active quote is a no-op success.
 */
export async function unarchiveQuote(
  repository: QuoteRepository,
  quoteId: string
): Promise<ArchiveQuoteResult> {
  const quote = await repository.findById(quoteId);
  if (!quote) return { ok: false, error: "Preventivo non trovato." };

  if (!quote.archivedAt) return { ok: true, quote };

  // Clearing the flag (not deleting the key) keeps the object shape stable;
  // the mapper persists `archivedAt: undefined` as NULL.
  const restored: Quote = { ...quote, archivedAt: undefined };
  await repository.save(restored);
  return { ok: true, quote: restored };
}
