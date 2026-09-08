import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { QuoteNumberConflictError } from "@/domain/quote/quote.errors";
import {
  type CreateQuoteInput,
  createQuoteInputSchema,
} from "@/application/quote/quote.schemas";
import { firstValidationMessage } from "@/application/quote/quote.errors";
import {
  buildClient,
  buildLineItem,
  buildMetadata,
  buildVatRate,
} from "@/application/quote/quote-builders";

export type CreateQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

interface CreateQuoteDeps {
  readonly repository: QuoteRepository;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

/** Parses and validates raw composer input; returns null-ish via result type. */
function parse(rawInput: unknown):
  | { ok: true; input: CreateQuoteInput }
  | { ok: false; error: string } {
  const parsed = createQuoteInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed.error) };
  }
  return { ok: true, input: parsed.data };
}

/** Use case: compose a new quote (status: draft) from the admin dashboard. */
export async function createQuote(
  deps: CreateQuoteDeps,
  rawInput: unknown
): Promise<CreateQuoteResult> {
  const result = parse(rawInput);
  if (!result.ok) return result;
  const input = result.input;

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => crypto.randomUUID());

  const issuedAt = now();

  const validUntil = new Date(`${input.validUntil}T23:59:59.999Z`);
  if (validUntil <= issuedAt) {
    return { ok: false, error: "La scadenza deve essere futura." };
  }

  // Persist with the max-based sequence for the year. If a concurrent create
  // grabs the same number first, the adapter raises QuoteNumberConflictError
  // and we pick the next free sequence and retry.
  const year = issuedAt.getUTCFullYear();
  const maxRetries = 5;
  for (let attempt = 0; ; attempt++) {
    const sequence = await deps.repository.nextSequenceForYear(year);
    const number = `PREV-${year}-${String(sequence).padStart(3, "0")}`;

    const quote: Quote = {
      id: generateId(),
      number,
      status: "draft",
      client: buildClient(input),
      project: input.project,
      intro: input.intro,
      issuedAt: issuedAt.toISOString(),
      validUntil: validUntil.toISOString(),
      fiscalRegime: input.fiscalRegime,
      vatRate: buildVatRate(input),
      lineItems: input.lineItems.map(buildLineItem),
      metadata: buildMetadata(input),
    };

    try {
      await deps.repository.save(quote);
      return { ok: true, quote };
    } catch (error) {
      if (error instanceof QuoteNumberConflictError && attempt < maxRetries) {
        continue;
      }
      throw error;
    }
  }
}
