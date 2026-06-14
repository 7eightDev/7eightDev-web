"use server";

import type { Quote } from "@/domain/quote/quote.types";
import {
  emailConfigFromEnv,
  quoteRepository,
} from "@/infrastructure/container";
import { findScenario } from "@/infrastructure/quote/email-preview.fixtures";
import { ResendQuoteNotificationAdapter } from "@/infrastructure/quote/resend-quote-notification.adapter";

export interface SendTestEmailResult {
  readonly ok: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

const isProd = process.env.NODE_ENV === "production";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Selection =
  | { quote: Quote; kind: "sent" | "accepted" }
  | { error: string };

/**
 * Resolves a selection id to a quote + email kind.
 * - `fixture:<id>` → a synthetic preview scenario.
 * - `quote:<uuid>` → a real quote loaded from the DB (client "sent" email).
 */
async function resolveSelection(selectionId: string): Promise<Selection> {
  if (selectionId.startsWith("quote:")) {
    const quoteId = selectionId.slice("quote:".length);
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) return { error: "Preventivo non trovato." };
    return { quote, kind: "sent" };
  }

  const fixtureId = selectionId.startsWith("fixture:")
    ? selectionId.slice("fixture:".length)
    : selectionId;
  const scenario = findScenario(fixtureId);
  if (!scenario) return { error: "Scenario non trovato." };
  return { quote: scenario.quote, kind: scenario.kind };
}

/**
 * Dev-only: sends an email through the real Resend adapter to an arbitrary test
 * address — without creating a quote or touching any quote status. Works with
 * both synthetic fixtures and real quotes; either way it bypasses the
 * `sendQuote`/`acceptQuote` use cases (no persistence, no status change). This
 * is a deliverability/rendering check, not a domain operation.
 *
 * Auth is enforced by the Clerk proxy (the action lives under the protected
 * `(private)` area); this guard adds defense-in-depth against prod exposure.
 */
export async function sendTestEmailAction(
  selectionId: string,
  to: string
): Promise<SendTestEmailResult> {
  if (isProd) {
    return { ok: false, error: "Strumento disponibile solo in sviluppo." };
  }

  const recipient = to.trim();
  if (!EMAIL_RE.test(recipient)) {
    return { ok: false, error: "Indirizzo email destinatario non valido." };
  }

  const selection = await resolveSelection(selectionId);
  if ("error" in selection) {
    return { ok: false, error: selection.error };
  }

  const config = emailConfigFromEnv();
  if (!config) {
    return {
      ok: false,
      error:
        "Configurazione email mancante (RESEND_API_KEY / QUOTE_FROM_EMAIL / QUOTE_REPLY_TO / APP_BASE_URL).",
    };
  }

  // Redirect every recipient to the test address: the client-facing email goes
  // to the quote's client.email; the owner alert goes to config.ownerInbox.
  const adapter = new ResendQuoteNotificationAdapter({
    ...config,
    ownerInbox: recipient,
  });

  if (selection.kind === "accepted") {
    const result = await adapter.notifyQuoteAccepted(selection.quote);
    return result.ok
      ? { ok: true, messageId: result.messageId }
      : { ok: false, error: result.error };
  }

  const quote: Quote = {
    ...selection.quote,
    client: { ...selection.quote.client, email: recipient },
  };
  const result = await adapter.notifyQuoteSent(quote);
  return result.ok
    ? { ok: true, messageId: result.messageId }
    : { ok: false, error: result.error };
}
