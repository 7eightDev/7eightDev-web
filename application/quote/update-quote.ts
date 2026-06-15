import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { createQuoteInputSchema } from "@/application/quote/quote.schemas";
import { firstValidationMessage } from "@/application/quote/quote.errors";
import {
  buildClient,
  buildLineItem,
  buildMetadata,
  buildVatRate,
} from "@/application/quote/quote-builders";

export type UpdateQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

interface UpdateQuoteDeps {
  readonly repository: QuoteRepository;
  readonly now?: () => Date;
}

/**
 * Use case: edit an existing quote. Only quotes still in `draft` are
 * editable — once sent, a quote is a commitment the client may be reading,
 * so its content is frozen. Identity (id, number, issuedAt) is preserved.
 */
export async function updateQuote(
  deps: UpdateQuoteDeps,
  quoteId: string,
  rawInput: unknown
): Promise<UpdateQuoteResult> {
  const parsed = createQuoteInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed.error) };
  }
  const input = parsed.data;

  const existing = await deps.repository.findById(quoteId);
  if (!existing) return { ok: false, error: "Preventivo non trovato." };
  if (existing.status !== "draft") {
    return {
      ok: false,
      error: "Solo le bozze possono essere modificate.",
    };
  }

  const now = deps.now ?? (() => new Date());
  const validUntil = new Date(`${input.validUntil}T23:59:59.999Z`);
  if (validUntil <= now()) {
    return { ok: false, error: "La scadenza deve essere futura." };
  }

  const updated: Quote = {
    ...existing,
    client: buildClient(input),
    project: input.project,
    intro: input.intro,
    validUntil: validUntil.toISOString(),
    fiscalRegime: input.fiscalRegime,
    vatRate: buildVatRate(input),
    lineItems: input.lineItems.map(buildLineItem),
    metadata: buildMetadata(input),
  };

  await deps.repository.save(updated);
  return { ok: true, quote: updated };
}
