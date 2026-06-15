import { updateQuote } from "@/application/quote/update-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote, QuoteStatus } from "@/domain/quote/quote.types";
import { moneyFromUnits } from "@/domain/shared/money";

const NOW = () => new Date("2026-06-11T10:00:00.000Z");

function existingQuote(status: QuoteStatus = "draft"): Quote {
  return {
    id: "7e1b9a4e-0000-4000-8000-000000000001",
    number: "PREV-2026-007",
    status,
    client: { name: "ACME Srl", company: "ACME Srl" },
    project: "Vecchio progetto",
    intro: "Bozza iniziale.",
    issuedAt: "2026-06-10T00:00:00.000Z",
    validUntil: "2026-07-10T23:59:59.999Z",
    fiscalRegime: "vat",
    vatRate: 0.22,
    lineItems: [
      {
        id: "landing-page",
        catalogRef: "landing-page",
        type: "one_time",
        title: "Landing Page",
        description: "Alta conversione",
        unitPrice: moneyFromUnits(2500),
        quantity: 1,
        optional: false,
      },
    ],
    metadata: {},
  };
}

function makeRepo(quote: Quote | null): QuoteRepository & { saved?: Quote } {
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

const editInput = {
  clientName: "ACME Srl",
  clientCompany: "ACME Srl",
  clientEmail: "info@acme.it",
  project: "Progetto aggiornato",
  intro: "Proposta rivista.",
  validUntil: "2026-08-01",
  vatRate: 0.22,
  lineItems: [
    {
      catalogRef: "landing-page",
      title: "Landing Page",
      description: "Alta conversione",
      priceUnits: 3000,
      quantity: 2,
      optional: false,
      type: "one_time",
    },
  ],
  phases: [{ a: "Discovery", b: "Sett. 1" }],
  terms: [{ a: "Pagamento", b: "50/50" }],
  techStack: [{ a: "Framework", b: "Next.js 16" }],
  timelineNote: "",
};

describe("updateQuote use case", () => {
  it("updates a draft and preserves identity (id, number, issuedAt, status)", async () => {
    const original = existingQuote("draft");
    const repo = makeRepo(original);

    const result = await updateQuote(
      { repository: repo, now: NOW },
      original.id,
      editInput
    );

    expect(result.ok).toBe(true);
    expect(repo.saved?.id).toBe(original.id);
    expect(repo.saved?.number).toBe(original.number);
    expect(repo.saved?.issuedAt).toBe(original.issuedAt);
    expect(repo.saved?.status).toBe("draft");
    // edited fields are applied
    expect(repo.saved?.project).toBe("Progetto aggiornato");
    expect(repo.saved?.lineItems[0].unitPrice.amountCents).toBe(300_000);
    expect(repo.saved?.lineItems[0].quantity).toBe(2);
  });

  it("refuses to edit a quote that is not a draft", async () => {
    const repo = makeRepo(existingQuote("sent"));
    const result = await updateQuote(
      { repository: repo, now: NOW },
      "7e1b9a4e-0000-4000-8000-000000000001",
      editInput
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/bozze/i);
    expect(repo.saved).toBeUndefined();
  });

  it("returns an error when the quote does not exist", async () => {
    const repo = makeRepo(null);
    const result = await updateQuote(
      { repository: repo, now: NOW },
      "missing-id",
      editInput
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/non trovato/i);
  });

  it("rejects a non-future expiry date", async () => {
    const repo = makeRepo(existingQuote("draft"));
    const result = await updateQuote(
      { repository: repo, now: NOW },
      "7e1b9a4e-0000-4000-8000-000000000001",
      { ...editInput, validUntil: "2026-06-10" }
    );
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("scadenza"),
    });
  });

  it("rejects invalid input with a readable error", async () => {
    const repo = makeRepo(existingQuote("draft"));
    const result = await updateQuote(
      { repository: repo, now: NOW },
      "7e1b9a4e-0000-4000-8000-000000000001",
      { ...editInput, clientName: "" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/nome cliente/i);
  });
});
