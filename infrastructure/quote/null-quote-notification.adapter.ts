import type {
  NotificationResult,
  QuoteNotificationPort,
} from "@/domain/quote/quote-notification.port";
import type { Quote } from "@/domain/quote/quote.types";

/**
 * Adapter: no-op notifier used when no email provider is configured
 * (local dev / demos without a Resend key, or CI). It reports success so the
 * `draft → sent` flow stays exercisable, and logs the would-be delivery.
 */
export class NullQuoteNotificationAdapter implements QuoteNotificationPort {
  async notifyQuoteSent(quote: Quote): Promise<NotificationResult> {
    console.warn(
      `[NullQuoteNotificationAdapter] Nessun provider email configurato — ` +
        `invio simulato del preventivo ${quote.number} a ${quote.client.email ?? "(nessuna email)"}.`
    );
    return { ok: true, messageId: `null-${quote.id}` };
  }

  async notifyQuoteAccepted(quote: Quote): Promise<NotificationResult> {
    console.warn(
      `[NullQuoteNotificationAdapter] Nessun provider email configurato — ` +
        `alert "accettato" simulato per il preventivo ${quote.number} ` +
        `(accettato da ${quote.acceptance?.acceptedByName ?? quote.client.name}).`
    );
    return { ok: true, messageId: `null-accepted-${quote.id}` };
  }
}
