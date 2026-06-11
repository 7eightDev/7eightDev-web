import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { LineItem, Quote } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";
import {
  type CreateQuoteInput,
  createQuoteInputSchema,
} from "@/application/quote/quote.schemas";

export type CreateQuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

interface CreateQuoteDeps {
  readonly repository: QuoteRepository;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

function buildLineItem(
  input: CreateQuoteInput["lineItems"][number],
  index: number
): LineItem {
  const base = {
    id: input.catalogRef ?? `item-${index + 1}`,
    catalogRef: input.catalogRef,
    title: input.title,
    description: input.description,
    unitPrice: moneyFromUnits(input.priceUnits),
    optional: input.optional,
  };
  return input.type === "recurring"
    ? { ...base, type: "recurring", interval: input.interval ?? "monthly" }
    : { ...base, type: "one_time" };
}

/** Use case: compose a new quote (status: draft) from the admin dashboard. */
export async function createQuote(
  deps: CreateQuoteDeps,
  rawInput: unknown
): Promise<CreateQuoteResult> {
  const parsed = createQuoteInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first.path.join(".")}: ${first.message}` };
  }
  const input = parsed.data;

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
    client: {
      name: input.clientName,
      company: input.clientCompany || undefined,
      email: input.clientEmail || undefined,
    },
    project: input.project,
    intro: input.intro,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    vatRate: input.vatRate,
    lineItems: input.lineItems.map(buildLineItem),
    metadata: {
      phases: input.phases.map((p) => ({ title: p.a, weeks: p.b })),
      terms: input.terms.map((t) => ({ label: t.a, body: t.b })),
      techStack: input.techStack.map((t) => ({
        label: t.a,
        technology: t.b,
      })),
      timelineNote: input.timelineNote || undefined,
    },
  };

  await deps.repository.save(quote);
  return { ok: true, quote };
}
