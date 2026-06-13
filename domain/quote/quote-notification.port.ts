import type { Quote } from "@/domain/quote/quote.types";

/**
 * Port: outbound quote notifications.
 *
 * Provider-agnostic on purpose — the domain knows only that "someone needs to
 * be notified about a quote", never *how* (Resend, SMTP, a queue…). Adapters
 * live in infrastructure/, same Ports/Adapters pattern as {@link QuoteRepository}
 * and the Legacy Bridge, so the provider stays swappable.
 */
export interface QuoteNotificationPort {
  /**
   * Deliver the "your quote is ready" message to the client.
   * Implementations must not throw on expected delivery failures — they return
   * an `ok: false` result so the use case can keep the quote re-sendable.
   */
  notifyQuoteSent(quote: Quote): Promise<NotificationResult>;

  /**
   * Notify the *owner* (not the client) that a quote was accepted.
   *
   * This is an operational alert, distinct from {@link notifyQuoteSent}: the
   * recipient is the 7eightDev inbox, configured in the adapter. It is a
   * best-effort side effect — the use case treats acceptance as already done
   * and never fails it because this delivery failed, so implementations still
   * return an `ok: false` result (never throw) for the use case to log.
   */
  notifyQuoteAccepted(quote: Quote): Promise<NotificationResult>;
}

export type NotificationResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly error: string };
