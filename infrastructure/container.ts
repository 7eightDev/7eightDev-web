import type { QuoteNotificationPort } from "@/domain/quote/quote-notification.port";
import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { NullQuoteNotificationAdapter } from "@/infrastructure/quote/null-quote-notification.adapter";
import { PrismaQuoteRepository } from "@/infrastructure/quote/prisma-quote.repository";
import { ResendQuoteNotificationAdapter } from "@/infrastructure/quote/resend-quote-notification.adapter";

/**
 * Composition root: single place where ports are bound to adapters.
 * Swap implementations here (e.g. in-memory for local demos without DB).
 */
export const quoteRepository: QuoteRepository = new PrismaQuoteRepository();

/**
 * Outbound quote notifications. Uses Resend when fully configured, otherwise
 * falls back to a no-op so the app still runs in dev/CI without a key.
 */
export const quoteNotifier: QuoteNotificationPort = buildQuoteNotifier();

function buildQuoteNotifier(): QuoteNotificationPort {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.QUOTE_FROM_EMAIL;
  const replyTo = process.env.QUOTE_REPLY_TO;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (apiKey && from && replyTo && appBaseUrl) {
    return new ResendQuoteNotificationAdapter({ apiKey, from, replyTo, appBaseUrl });
  }

  console.warn(
    "[container] Configurazione email incompleta (RESEND_API_KEY / QUOTE_FROM_EMAIL / " +
      "QUOTE_REPLY_TO / APP_BASE_URL) — uso NullQuoteNotificationAdapter."
  );
  return new NullQuoteNotificationAdapter();
}
