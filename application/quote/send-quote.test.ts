import { sendQuote } from "@/application/quote/send-quote";
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
  status: "draft",
  client: { name: "ACME", email: "info@acme.it" },
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

function notifier(
  result: NotificationResult
): QuoteNotificationPort & { calls: Quote[] } {
  const spy: QuoteNotificationPort & { calls: Quote[] } = {
    calls: [],
    async notifyQuoteSent(quote: Quote) {
      spy.calls.push(quote);
      return result;
    },
    async notifyQuoteAccepted() {
      return { ok: true, messageId: "accepted-msg-1" } as NotificationResult;
    },
  };
  return spy;
}

const OK: NotificationResult = { ok: true, messageId: "msg-1" };

describe("sendQuote use case", () => {
  it("sends the email and flips draft → sent on success", async () => {
    const repo = repoWith(baseQuote);
    const notify = notifier(OK);

    const result = await sendQuote(repo, notify, "q-1");

    expect(result.ok).toBe(true);
    expect(notify.calls).toHaveLength(1);
    expect(repo.saved?.status).toBe("sent");
  });

  it("returns an error when the quote does not exist", async () => {
    const repo = repoWith(null);
    const notify = notifier(OK);

    const result = await sendQuote(repo, notify, "missing");

    expect(result).toEqual({ ok: false, error: "Preventivo non trovato." });
    expect(notify.calls).toHaveLength(0);
  });

  it("refuses to send a quote that is not a draft", async () => {
    const repo = repoWith({ ...baseQuote, status: "sent" });
    const notify = notifier(OK);

    const result = await sendQuote(repo, notify, "q-1");

    expect(result.ok).toBe(false);
    expect(notify.calls).toHaveLength(0);
    expect(repo.saved).toBeUndefined();
  });

  it("requires a client email and does not flip status without one", async () => {
    const repo = repoWith({ ...baseQuote, client: { name: "ACME" } });
    const notify = notifier(OK);

    const result = await sendQuote(repo, notify, "q-1");

    expect(result.ok).toBe(false);
    expect(notify.calls).toHaveLength(0);
    expect(repo.saved).toBeUndefined();
  });

  it("keeps the quote a draft when the email fails to send", async () => {
    const repo = repoWith(baseQuote);
    const notify = notifier({ ok: false, error: "boom" });

    const result = await sendQuote(repo, notify, "q-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("boom");
    expect(repo.saved).toBeUndefined();
  });
});
