import { rejectQuote } from "@/application/quote/reject-quote";
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

describe("rejectQuote use case", () => {
  it("transitions a sent quote to rejected", async () => {
    const repo = repoWith(baseQuote);
    const result = await rejectQuote(repo, "q-1");

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("rejected");
  });

  it.each<QuoteStatus>(["draft", "accepted", "rejected", "expired"])(
    "refuses to reject a %s quote",
    async (status) => {
      const repo = repoWith({ ...baseQuote, status });
      const result = await rejectQuote(repo, "q-1");

      expect(result.ok).toBe(false);
      expect(repo.saved).toBeUndefined();
    }
  );

  it("returns an error for unknown quotes", async () => {
    const result = await rejectQuote(repoWith(null), "missing");
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});
