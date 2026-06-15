import type {
  ClientInfo,
  Discount,
  LineItem,
  QuoteMetadata,
} from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";
import type {
  CreateQuoteInput,
  DiscountInput,
} from "@/application/quote/quote.schemas";

/**
 * Pure builders that translate validated composer input into the domain
 * shapes of a Quote. Shared by the create and update use cases so the two
 * stay in lockstep (a field added to one is honoured by both).
 */

export function buildLineItem(
  input: CreateQuoteInput["lineItems"][number],
  index: number
): LineItem {
  const base = {
    id: input.catalogRef ?? `item-${index + 1}`,
    catalogRef: input.catalogRef,
    title: input.title,
    description: input.description,
    unitPrice: moneyFromUnits(input.priceUnits),
    quantity: input.quantity,
    unit: input.unit || undefined,
    optional: input.optional,
  };
  return input.type === "recurring"
    ? { ...base, type: "recurring", interval: input.interval ?? "monthly" }
    : { ...base, type: "one_time" };
}

/** Maps composer discount input (percent 0–100 / euros) to the domain Discount. */
export function buildDiscount(input?: DiscountInput): Discount | undefined {
  if (!input) return undefined;
  if (input.kind === "percent") {
    if (input.value <= 0) return undefined;
    return { kind: "percent", value: input.value / 100 };
  }
  if (input.amountUnits <= 0) return undefined;
  return { kind: "fixed", amount: moneyFromUnits(input.amountUnits) };
}

/**
 * Resolves the effective VAT rate. Prestazione occasionale is outside the
 * scope of VAT, so the regime — not the form field — is the source of truth:
 * an "occasional" quote is always 0, regardless of what was typed.
 */
export function buildVatRate(input: CreateQuoteInput): number {
  return input.fiscalRegime === "occasional" ? 0 : input.vatRate;
}

export function buildClient(input: CreateQuoteInput): ClientInfo {
  return {
    name: input.clientName,
    company: input.clientCompany || undefined,
    email: input.clientEmail || undefined,
  };
}

export function buildMetadata(input: CreateQuoteInput): QuoteMetadata {
  return {
    phases: input.phases.map((p) => ({ title: p.a, weeks: p.b })),
    terms: input.terms.map((t) => ({ label: t.a, body: t.b })),
    techStack: input.techStack.map((t) => ({
      label: t.a,
      technology: t.b,
    })),
    timelineNote: input.timelineNote || undefined,
    discount: buildDiscount(input.discount),
    pricingDisplay: input.pricingDisplay,
  };
}
