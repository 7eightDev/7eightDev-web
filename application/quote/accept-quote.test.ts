import { acceptQuote } from "@/application/quote/accept-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
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
    {
      id: "opt-1",
      type: "one_time",
      title: "Opzione",
      description: "",
      unitPrice: moneyFromUnits(500),
      optional: true,
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
    async countByYear() {
      return 0;
    },
  };
  return repo;
}

const NOW = () => new Date("2026-06-15T12:00:00.000Z");

describe("acceptQuote use case", () => {
  it("accepts a sent quote and records the acceptance", async () => {
    const repo = repoWith(baseQuote);
    const result = await acceptQuote(
      repo,
      { quoteId: "q-1", acceptedByName: "Mario Rossi", selectedOptionalIds: ["opt-1"] },
      NOW
    );

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("accepted");
    expect(repo.saved?.acceptance).toMatchObject({
      acceptedByName: "Mario Rossi",
      acceptedAt: "2026-06-15T12:00:00.000Z",
      selectedOptionalIds: ["opt-1"],
    });
  });

  it("filters out ids that are not optional line items", async () => {
    const repo = repoWith(baseQuote);
    await acceptQuote(
      repo,
      {
        quoteId: "q-1",
        acceptedByName: "Mario",
        selectedOptionalIds: ["base", "ghost", "opt-1"],
      },
      NOW
    );
    expect(repo.saved?.acceptance?.selectedOptionalIds).toEqual(["opt-1"]);
  });

  it("rejects an empty name", async () => {
    const result = await acceptQuote(
      repoWith(baseQuote),
      { quoteId: "q-1", acceptedByName: "  ", selectedOptionalIds: [] },
      NOW
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("nome") });
  });

  it("rejects an expired quote", async () => {
    const result = await acceptQuote(
      repoWith(baseQuote),
      { quoteId: "q-1", acceptedByName: "Mario", selectedOptionalIds: [] },
      () => new Date("2026-08-01T00:00:00.000Z")
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("scaduto") });
  });

  it("rejects invalid status transitions (draft → accepted)", async () => {
    const result = await acceptQuote(
      repoWith({ ...baseQuote, status: "draft" }),
      { quoteId: "q-1", acceptedByName: "Mario", selectedOptionalIds: [] },
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("returns an error for unknown quotes", async () => {
    const result = await acceptQuote(
      repoWith(null),
      { quoteId: "missing", acceptedByName: "Mario", selectedOptionalIds: [] },
      NOW
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});
