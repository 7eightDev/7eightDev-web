import type {
  LineItem,
  Quote,
  QuoteCalculation,
} from "@/domain/quote/quote.types";
import {
  type Money,
  formatMoney,
  sum,
  vatOf,
  add,
} from "@/domain/shared/money";

/**
 * A line item is included in the totals when it is mandatory,
 * or when it is optional and the client has selected it.
 */
function isIncluded(item: LineItem, selectedOptionalIds: ReadonlySet<string>): boolean {
  return !item.optional || selectedOptionalIds.has(item.id);
}

export function calculateQuote(
  quote: Quote,
  selectedOptionalIds: readonly string[] = []
): QuoteCalculation {
  const selected = new Set(selectedOptionalIds);
  const included = quote.lineItems.filter((item) => isIncluded(item, selected));

  const prices = (items: LineItem[]): Money[] =>
    items.map((item) => item.unitPrice);

  const oneTimeSubtotal = sum(
    prices(included.filter((item) => item.type === "one_time"))
  );
  const vat = vatOf(oneTimeSubtotal, quote.vatRate);

  const recurring = included.filter((item) => item.type === "recurring");
  const monthlyRecurring = sum(
    prices(recurring.filter((item) => item.interval === "monthly"))
  );
  const yearlyRecurring = sum(
    prices(recurring.filter((item) => item.interval === "yearly"))
  );

  return {
    oneTimeSubtotal,
    vat,
    oneTimeTotal: add(oneTimeSubtotal, vat),
    monthlyRecurring,
    yearlyRecurring,
  };
}

export const formatCurrency = formatMoney;
