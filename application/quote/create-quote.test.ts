import { createQuote } from "@/application/quote/create-quote";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";

function makeRepo(existingInYear = 0): QuoteRepository & { saved?: Quote } {
  const repo: QuoteRepository & { saved?: Quote } = {
    async findById() {
      return null;
    },
    async findAll() {
      return [];
    },
    async save(q: Quote) {
      repo.saved = q;
    },
    async countByYear() {
      return existingInYear;
    },
  };
  return repo;
}

const NOW = () => new Date("2026-06-11T10:00:00.000Z");

const validInput = {
  clientName: "ACME Srl",
  clientCompany: "ACME Srl",
  clientEmail: "info@acme.it",
  project: "Sito corporate",
  intro: "Una proposta.",
  validUntil: "2026-07-11",
  vatRate: 0.22,
  lineItems: [
    {
      catalogRef: "landing-page",
      title: "Landing Page",
      description: "Alta conversione",
      priceUnits: 2500,
      optional: false,
      type: "one_time",
    },
    {
      title: "Voce libera",
      description: "Custom",
      priceUnits: 800,
      optional: true,
      type: "one_time",
    },
  ],
  phases: [{ a: "Discovery", b: "Sett. 1" }],
  terms: [{ a: "Pagamento", b: "40/30/30" }],
  techStack: [{ a: "Framework", b: "Next.js 16" }],
  timelineNote: "",
};

describe("createQuote use case", () => {
  it("creates a draft with progressive PREV-YYYY-NNN number", async () => {
    const repo = makeRepo(13);
    const result = await createQuote({ repository: repo, now: NOW }, validInput);

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("draft");
    expect(repo.saved?.number).toBe("PREV-2026-014");
    expect(repo.saved?.lineItems).toHaveLength(2);
    expect(repo.saved?.lineItems[0].unitPrice.amountCents).toBe(250_000);
    expect(repo.saved?.lineItems[0].catalogRef).toBe("landing-page");
    expect(repo.saved?.metadata.phases).toEqual([
      { title: "Discovery", weeks: "Sett. 1" },
    ]);
  });

  it("rejects invalid input with a readable error", async () => {
    const result = await createQuote(
      { repository: makeRepo(), now: NOW },
      { ...validInput, clientName: "" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("clientName");
  });

  it("rejects a non-future expiry date", async () => {
    const result = await createQuote(
      { repository: makeRepo(), now: NOW },
      { ...validInput, validUntil: "2026-06-10" }
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("scadenza") });
  });

  it("requires at least one line item", async () => {
    const result = await createQuote(
      { repository: makeRepo(), now: NOW },
      { ...validInput, lineItems: [] }
    );
    expect(result.ok).toBe(false);
  });

  it("defaults quantity to 1 when omitted", async () => {
    const repo = makeRepo();
    await createQuote({ repository: repo, now: NOW }, validInput);
    expect(repo.saved?.lineItems[0].quantity).toBe(1);
  });

  it("preserves an explicit quantity", async () => {
    const repo = makeRepo();
    await createQuote(
      { repository: repo, now: NOW },
      {
        ...validInput,
        lineItems: [{ ...validInput.lineItems[0], quantity: 4 }],
      }
    );
    expect(repo.saved?.lineItems[0].quantity).toBe(4);
  });

  it("converts a percentage discount input to a fraction in metadata", async () => {
    const repo = makeRepo();
    await createQuote(
      { repository: repo, now: NOW },
      { ...validInput, discount: { kind: "percent", value: 15 } }
    );
    expect(repo.saved?.metadata.discount).toEqual({
      kind: "percent",
      value: 0.15,
    });
  });

  it("converts a fixed discount input to Money in metadata", async () => {
    const repo = makeRepo();
    await createQuote(
      { repository: repo, now: NOW },
      { ...validInput, discount: { kind: "fixed", amountUnits: 300 } }
    );
    expect(repo.saved?.metadata.discount).toEqual({
      kind: "fixed",
      amount: { amountCents: 30_000, currency: "EUR" },
    });
  });

  it("drops a zero discount", async () => {
    const repo = makeRepo();
    await createQuote(
      { repository: repo, now: NOW },
      { ...validInput, discount: { kind: "percent", value: 0 } }
    );
    expect(repo.saved?.metadata.discount).toBeUndefined();
  });

  it("defaults to the vat regime and honours the typed vatRate when omitted", async () => {
    const repo = makeRepo();
    await createQuote({ repository: repo, now: NOW }, validInput);
    expect(repo.saved?.fiscalRegime).toBe("vat");
    expect(repo.saved?.vatRate).toBe(0.22);
  });

  it("forces vatRate to 0 under the occasional regime, ignoring the typed value", async () => {
    const repo = makeRepo();
    await createQuote(
      { repository: repo, now: NOW },
      { ...validInput, fiscalRegime: "occasional", vatRate: 0.22 }
    );
    expect(repo.saved?.fiscalRegime).toBe("occasional");
    expect(repo.saved?.vatRate).toBe(0);
  });
});
