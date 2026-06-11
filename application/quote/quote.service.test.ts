import { calculateQuote } from "@/application/quote/quote.service";
import type { LineItem, Quote } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

const lineItems: LineItem[] = [
  {
    id: "landing",
    type: "one_time",
    title: "Landing Page",
    description: "High-conversion landing page",
    unitPrice: moneyFromUnits(3000),
    optional: false,
  },
  {
    id: "cms",
    type: "one_time",
    title: "CMS Integration",
    description: "Headless CMS setup",
    unitPrice: moneyFromUnits(1500),
    optional: true,
  },
  {
    id: "audit",
    type: "one_time",
    title: "Performance Audit",
    description: "Core Web Vitals audit",
    unitPrice: moneyFromUnits(800),
    optional: true,
  },
  {
    id: "maintenance",
    type: "recurring",
    interval: "monthly",
    title: "Maintenance",
    description: "Updates and monitoring",
    unitPrice: moneyFromUnits(150),
    optional: true,
  },
];

const quote: Quote = {
  id: "7e1b9a4e-0000-4000-8000-000000000001",
  number: "2026-001",
  status: "sent",
  client: { name: "Mario Rossi", company: "ACME Srl" },
  project: "Corporate website",
  intro: "Proposta per il rifacimento del sito",
  issuedAt: "2026-06-11T00:00:00.000Z",
  validUntil: "2026-07-11T00:00:00.000Z",
  vatRate: 0.22,
  lineItems,
  metadata: {},
};

describe("calculateQuote", () => {
  it("includes only mandatory items when nothing is selected", () => {
    const calc = calculateQuote(quote);
    expect(calc.oneTimeSubtotal.amountCents).toBe(300_000);
    expect(calc.vat.amountCents).toBe(66_000);
    expect(calc.oneTimeTotal.amountCents).toBe(366_000);
    expect(calc.monthlyRecurring.amountCents).toBe(0);
  });

  it("adds selected optional one-time items to the total", () => {
    const calc = calculateQuote(quote, ["cms", "audit"]);
    expect(calc.oneTimeSubtotal.amountCents).toBe(530_000);
    expect(calc.oneTimeTotal.amountCents).toBe(646_600);
  });

  it("keeps recurring items out of the one-time total", () => {
    const calc = calculateQuote(quote, ["maintenance"]);
    expect(calc.oneTimeSubtotal.amountCents).toBe(300_000);
    expect(calc.monthlyRecurring.amountCents).toBe(15_000);
    expect(calc.yearlyRecurring.amountCents).toBe(0);
  });

  it("ignores selection ids that do not exist", () => {
    const calc = calculateQuote(quote, ["ghost-item"]);
    expect(calc.oneTimeSubtotal.amountCents).toBe(300_000);
  });
});
