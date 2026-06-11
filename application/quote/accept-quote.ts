import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { assertTransition } from "@/domain/quote/quote.status";
import type { AcceptanceRecord, Quote } from "@/domain/quote/quote.types";

export interface AcceptQuoteInput {
  readonly quoteId: string;
  readonly acceptedByName: string;
  readonly selectedOptionalIds: readonly string[];
  readonly ipAddress?: string;
}

export type AcceptQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: the client accepts a quote from the public page.
 * Pure application logic — transport (server action) and persistence
 * (repository) are injected.
 */
export async function acceptQuote(
  repository: QuoteRepository,
  input: AcceptQuoteInput,
  now: () => Date = () => new Date()
): Promise<AcceptQuoteResult> {
  const name = input.acceptedByName.trim();
  if (name.length < 2) {
    return { ok: false, error: "Inserisci il tuo nome per accettare." };
  }

  const quote = await repository.findById(input.quoteId);
  if (!quote) {
    return { ok: false, error: "Preventivo non trovato." };
  }

  if (new Date(quote.validUntil) < now()) {
    return { ok: false, error: "Questo preventivo è scaduto." };
  }

  try {
    assertTransition(quote.status, "accepted");
  } catch {
    return {
      ok: false,
      error: `Il preventivo non è accettabile (stato: ${quote.status}).`,
    };
  }

  // Never trust the client: keep only ids of actually optional line items.
  const optionalIds = new Set(
    quote.lineItems.filter((item) => item.optional).map((item) => item.id)
  );
  const selectedOptionalIds = input.selectedOptionalIds.filter((id) =>
    optionalIds.has(id)
  );

  const acceptance: AcceptanceRecord = {
    acceptedByName: name,
    acceptedAt: now().toISOString(),
    ipAddress: input.ipAddress,
    selectedOptionalIds,
  };

  const accepted: Quote = { ...quote, status: "accepted", acceptance };
  await repository.save(accepted);

  return { ok: true, quote: accepted };
}
