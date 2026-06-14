import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import {
  type CreateQuoteInput,
  createQuoteInputSchema,
} from "@/application/quote/quote.schemas";
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
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first.path.join(".")}: ${first.message}` };
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
  const year = issuedAt.getUTCFullYear();
  const sequence = (await deps.repository.countByYear(year)) + 1;
  const number = `PREV-${year}-${String(sequence).padStart(3, "0")}`;

  const validUntil = new Date(`${input.validUntil}T23:59:59.999Z`);
  if (validUntil <= issuedAt) {
    return { ok: false, error: "La scadenza deve essere futura." };
  }

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

  await deps.repository.save(quote);
  return { ok: true, quote };
}
