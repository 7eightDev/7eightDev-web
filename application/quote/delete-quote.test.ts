import { deleteQuote } from "@/application/quote/delete-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote, QuoteStatus } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

const baseQuote: Quote = {
  id: "q-1",
  number: "2026-001",
  status: "draft",
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

function repoWith(quote: Quote | null): QuoteRepository & { deleted: string[] } {
  const repo: QuoteRepository & { deleted: string[] } = {
    deleted: [],
    async findById() {
      return quote;
    },
    async findAll() {
      return quote ? [quote] : [];
    },
    async save() {},
    async delete(id: string) {
      repo.deleted.push(id);
    },
    async countByYear() {
      return 0;
    },
  };
  return repo;
}

describe("deleteQuote use case", () => {
  it("permanently deletes a draft quote", async () => {
    const repo = repoWith(baseQuote);
    const result = await deleteQuote(repo, "q-1");

    expect(result.ok).toBe(true);
    expect(repo.deleted).toEqual(["q-1"]);
  });

  it.each<QuoteStatus>(["sent", "accepted", "rejected", "expired"])(
    "refuses to delete a %s quote and leaves it untouched",
    async (status) => {
      const repo = repoWith({ ...baseQuote, status });
      const result = await deleteQuote(repo, "q-1");

      expect(result).toMatchObject({ ok: false, error: expect.stringContaining("bozze") });
      expect(repo.deleted).toEqual([]);
    }
  );

  it("returns an error for unknown quotes", async () => {
    const repo = repoWith(null);
    const result = await deleteQuote(repo, "missing");

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
    expect(repo.deleted).toEqual([]);
  });
});
