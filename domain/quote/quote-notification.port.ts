import type { Quote } from "@/domain/quote/quote.types";

/**
 * Port: outbound notification when a quote is sent to its client.
 *
 * Provider-agnostic on purpose — the domain knows only that "a quote needs to
 * reach the client", never *how* (Resend, SMTP, a queue…). Adapters live in
 * infrastructure/, same Ports/Adapters pattern as {@link QuoteRepository} and
 * the Legacy Bridge, so the provider stays swappable.
 */
export interface QuoteNotificationPort {
  /**
   * Deliver the "your quote is ready" message to the client.
   * Implementations must not throw on expected delivery failures — they return
   * an `ok: false` result so the use case can keep the quote re-sendable.
   */
  notifyQuoteSent(quote: Quote): Promise<NotificationResult>;
}

export type NotificationResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly error: string };
