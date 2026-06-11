/**
 * Money value object.
 *
 * Amounts are stored as integer cents to avoid floating-point drift.
 * All operations are pure and return new Money instances.
 */

export type Currency = "EUR" | "USD";

export interface Money {
  /** Amount in minor units (cents). Always an integer. */
  readonly amountCents: number;
  readonly currency: Currency;
}

export function money(amountCents: number, currency: Currency = "EUR"): Money {
  if (!Number.isInteger(amountCents)) {
    throw new Error(
      `Money amount must be integer cents, received: ${amountCents}`
    );
  }
  return { amountCents, currency };
}

/** Convenience constructor from whole units (e.g. euros). */
export function moneyFromUnits(
  units: number,
  currency: Currency = "EUR"
): Money {
  return money(Math.round(units * 100), currency);
}

export const zero = (currency: Currency = "EUR"): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot operate on ${a.currency} and ${b.currency}`
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountCents + b.amountCents, a.currency);
}

export function sum(items: readonly Money[], currency: Currency = "EUR"): Money {
  return items.reduce(add, zero(currency));
}

export function multiply(m: Money, factor: number): Money {
  return money(Math.round(m.amountCents * factor), m.currency);
}

/** Returns the VAT portion (not the gross total). */
export function vatOf(net: Money, rate: number): Money {
  return multiply(net, rate);
}

export function equals(a: Money, b: Money): boolean {
  return a.amountCents === b.amountCents && a.currency === b.currency;
}

export function formatMoney(m: Money, locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: m.amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(m.amountCents / 100);
}
