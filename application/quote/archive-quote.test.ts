import { archiveQuote, unarchiveQuote } from "@/application/quote/archive-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

const baseQuote: Quote = {
  id: "q-1",
  number: "2026-001",
  status: "accepted",
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

function repoWith(quote: Quote | null): QuoteRepository & {
  saved?: Quote;
  deleted: string[];
} {
  const repo: QuoteRepository & { saved?: Quote; deleted: string[] } = {
    deleted: [],
    async findById() {
      return repo.saved ?? quote;
    },
    async findAll() {
      return quote ? [quote] : [];
    },
    async save(q: Quote) {
      repo.saved = q;
    },
    async delete(id: string) {
      repo.deleted.push(id);
    },
    async countByYear() {
      return 0;
    },
  };
  return repo;
}

const NOW = () => new Date("2026-06-15T12:00:00.000Z");

describe("archiveQuote use case", () => {
  it("sets archivedAt without touching the lifecycle status", async () => {
    const repo = repoWith(baseQuote);
    const result = await archiveQuote(repo, "q-1", NOW());

    expect(result.ok).toBe(true);
    expect(repo.saved?.archivedAt).toBe("2026-06-15T12:00:00.000Z");
    expect(repo.saved?.status).toBe("accepted");
  });

  it("refuses to archive a sent quote (awaiting client answer)", async () => {
    const repo = repoWith({ ...baseQuote, status: "sent" });
    const result = await archiveQuote(repo, "q-1", NOW());

    expect(result.ok).toBe(false);
    expect(repo.saved).toBeUndefined();
  });

  it("is idempotent when already archived (no re-save needed)", async () => {
    const repo = repoWith({ ...baseQuote, archivedAt: "2026-06-10T00:00:00.000Z" });
    const result = await archiveQuote(repo, "q-1", NOW());

    expect(result.ok).toBe(true);
    expect(repo.saved).toBeUndefined();
  });

  it("returns an error for unknown quotes", async () => {
    const result = await archiveQuote(repoWith(null), "missing", NOW());
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});

describe("unarchiveQuote use case", () => {
  it("clears archivedAt and preserves the original status", async () => {
    const repo = repoWith({ ...baseQuote, archivedAt: "2026-06-10T00:00:00.000Z" });
    const result = await unarchiveQuote(repo, "q-1");

    expect(result.ok).toBe(true);
    expect(repo.saved?.archivedAt).toBeUndefined();
    expect(repo.saved?.status).toBe("accepted");
  });

  it("is idempotent when not archived (no re-save needed)", async () => {
    const repo = repoWith(baseQuote);
    const result = await unarchiveQuote(repo, "q-1");

    expect(result.ok).toBe(true);
    expect(repo.saved).toBeUndefined();
  });

  it("returns an error for unknown quotes", async () => {
    const result = await unarchiveQuote(repoWith(null), "missing");
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});
