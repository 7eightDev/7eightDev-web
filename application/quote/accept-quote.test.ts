import { acceptQuote } from "@/application/quote/accept-quote";
import type {
  NotificationResult,
  QuoteNotificationPort,
} from "@/domain/quote/quote-notification.port";
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

const OK: NotificationResult = { ok: true, messageId: "accepted-msg-1" };

/**
 * Spy notifier. `acceptedResult` lets a test drive the owner-alert outcome;
 * `accepted` collects the quotes it was called with so we can assert the
 * use case fires the alert exactly once on success.
 */
function notifier(
  acceptedResult: NotificationResult | (() => Promise<NotificationResult>) = OK
): QuoteNotificationPort & { accepted: Quote[] } {
  const spy: QuoteNotificationPort & { accepted: Quote[] } = {
    accepted: [],
    async notifyQuoteSent() {
      return OK;
    },
    async notifyQuoteAccepted(quote: Quote) {
      spy.accepted.push(quote);
      return typeof acceptedResult === "function"
        ? acceptedResult()
        : acceptedResult;
    },
  };
  return spy;
}

const NOW = () => new Date("2026-06-15T12:00:00.000Z");

describe("acceptQuote use case", () => {
  it("accepts a sent quote and records the acceptance", async () => {
    const repo = repoWith(baseQuote);
    const result = await acceptQuote(
      repo,
      notifier(),
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

  it("fires the owner alert once with the accepted quote", async () => {
    const repo = repoWith(baseQuote);
    const notify = notifier();

    await acceptQuote(
      repo,
      notify,
      { quoteId: "q-1", acceptedByName: "Mario Rossi", selectedOptionalIds: ["opt-1"] },
      NOW
    );

    expect(notify.accepted).toHaveLength(1);
    expect(notify.accepted[0]).toMatchObject({
      id: "q-1",
      status: "accepted",
    });
  });

  it("still accepts when the owner alert fails (best-effort)", async () => {
    const repo = repoWith(baseQuote);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await acceptQuote(
      repo,
      notifier({ ok: false, error: "boom" }),
      { quoteId: "q-1", acceptedByName: "Mario Rossi", selectedOptionalIds: [] },
      NOW
    );

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("accepted");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("still accepts when the notifier throws", async () => {
    const repo = repoWith(baseQuote);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await acceptQuote(
      repo,
      notifier(async () => {
        throw new Error("network down");
      }),
      { quoteId: "q-1", acceptedByName: "Mario Rossi", selectedOptionalIds: [] },
      NOW
    );

    expect(result.ok).toBe(true);
    expect(repo.saved?.status).toBe("accepted");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("filters out ids that are not optional line items", async () => {
    const repo = repoWith(baseQuote);
    await acceptQuote(
      repo,
      notifier(),
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
      notifier(),
      { quoteId: "q-1", acceptedByName: "  ", selectedOptionalIds: [] },
      NOW
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("nome") });
  });

  it("rejects an expired quote", async () => {
    const result = await acceptQuote(
      repoWith(baseQuote),
      notifier(),
      { quoteId: "q-1", acceptedByName: "Mario", selectedOptionalIds: [] },
      () => new Date("2026-08-01T00:00:00.000Z")
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("scaduto") });
  });

  it("rejects invalid status transitions (draft → accepted)", async () => {
    const result = await acceptQuote(
      repoWith({ ...baseQuote, status: "draft" }),
      notifier(),
      { quoteId: "q-1", acceptedByName: "Mario", selectedOptionalIds: [] },
      NOW
    );
    expect(result.ok).toBe(false);
  });

  it("returns an error for unknown quotes", async () => {
    const result = await acceptQuote(
      repoWith(null),
      notifier(),
      { quoteId: "missing", acceptedByName: "Mario", selectedOptionalIds: [] },
      NOW
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("trovato") });
  });
});
