import { expireQuote } from "@/application/quote/expire-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote, QuoteStatus } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

const baseQuote: Quote = {
  id: "q-1",
  number: "2026-001",
  status: "sent",
  client: { name: "ACME" },
  project: "Sito",
  intro: "",
  issuedAt: "2026-06-01T00:00:00.000Z",
  validUntil: "2026-07-01T00:00:00.000Z",
  fiscalRegime: "vat",
  vatRate: 0.22,
  lineItems: [
    {
      id: "base",
      type: "one_time",
      title: "Base",
      description: "",
      unitPrice: moneyFromUnits(1000),
      optional: false,
    },
  ],
  metadata: {},
};

function repoWith(quote: Quote | null): QuoteRepository & { saved?: Quote } {
  const repo: QuoteRepository & { saved?: Quote } = {
    async findById() {
      return quote;
    },
    async findAll() {
      return quote ? [quote] : [];
    },
    async save(q: Quote) {
      repo.saved = q;
    },
    async delete() {},
    async countByYear() {
      return 0;
    },
  };
  return repo;
}

const AFTER = () => new Date("2026-07-02T00:00:00.000Z"); // past validUntil
const BEFORE = () => new Date("2026-06-15T00:00:00.000Z"); // still valid

describe("expireQuote use case", () => {
  it("transitions a sent quote to expired once validity has lapsed", async () => {
    const repo = repoWith(baseQuote);
    const result = await expireQuote(repo, "q-1", AFTER());

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("expired");
  });

  it("refuses to expire a quote that is still valid", async () => {
    const repo = repoWith(baseQuote);
    const result = await expireQuote(repo, "q-1", BEFORE());

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("valido") });
    expect(repo.saved).toBeUndefined();
  });

  it.each<QuoteStatus>(["draft", "accepted", "rejected", "expired"])(
    "refuses to expire a %s quote",
    async (status) => {
      const repo = repoWith({ ...baseQuote, status });
      const result = await expireQuote(repo, "q-1", AFTER());

      expect(result.ok).toBe(false);
      expect(repo.saved).toBeUndefined();
    }
  );

  it("returns an error for unknown quotes", async () => {
    const result = await expireQuote(repoWith(null), "missing", AFTER());
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});
