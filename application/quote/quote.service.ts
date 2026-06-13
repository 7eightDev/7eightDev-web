import type {
  Discount,
  LineItem,
  Quote,
  QuoteCalculation,
} from "@/domain/quote/quote.types";
import {
  type Money,
  add,
  formatMoney,
  min,
  multiply,
  subtract,
  sum,
  vatOf,
  zero,
} from "@/domain/shared/money";

/**
 * A line item is included in the totals when it is mandatory,
 * or when it is optional and the client has selected it.
 */
function isIncluded(item: LineItem, selectedOptionalIds: ReadonlySet<string>): boolean {
  return !item.optional || selectedOptionalIds.has(item.id);
}

/** Total billed for a line: unit price × quantity (quantity defaults to 1). */
export function lineTotal(item: LineItem): Money {
  return multiply(item.unitPrice, item.quantity ?? 1);
}

/** Discount amount applied to a one-time subtotal. Capped so it never exceeds it. */
function discountAmount(subtotal: Money, discount?: Discount): Money {
  if (!discount) return zero(subtotal.currency);
  if (discount.kind === "percent") {
    const fraction = Math.min(Math.max(discount.value, 0), 1);
    return min(multiply(subtotal, fraction), subtotal);
  }
  return min(discount.amount, subtotal);
}

export function calculateQuote(
  quote: Quote,
  selectedOptionalIds: readonly string[] = []
): QuoteCalculation {
  const selected = new Set(selectedOptionalIds);
  const included = quote.lineItems.filter((item) => isIncluded(item, selected));

  const totals = (items: LineItem[]): Money[] => items.map(lineTotal);

  const oneTimeSubtotal = sum(
    totals(included.filter((item) => item.type === "one_time"))
  );
  const discount = discountAmount(oneTimeSubtotal, quote.metadata.discount);
  const oneTimeNet = subtract(oneTimeSubtotal, discount);
  const vat = vatOf(oneTimeNet, quote.vatRate);

  const recurring = included.filter((item) => item.type === "recurring");
  const monthlyRecurring = sum(
    totals(recurring.filter((item) => item.interval === "monthly"))
  );
  const yearlyRecurring = sum(
    totals(recurring.filter((item) => item.interval === "yearly"))
  );

  return {
    oneTimeSubtotal,
    discount,
    oneTimeNet,
    vat,
    oneTimeTotal: add(oneTimeNet, vat),
    monthlyRecurring,
    yearlyRecurring,
  };
}

export const formatCurrency = formatMoney;
