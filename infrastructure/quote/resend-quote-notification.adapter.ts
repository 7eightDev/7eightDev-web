import { Resend } from "resend";
import type {
  NotificationResult,
  QuoteNotificationPort,
} from "@/domain/quote/quote-notification.port";
import type { Quote } from "@/domain/quote/quote.types";

export interface ResendQuoteNotificationConfig {
  /** Resend API key (server-only secret). */
  readonly apiKey: string;
  /** Sender, friendly format: `"7eightDev <preventivi@send.7eightdev.com>"`. */
  readonly from: string;
  /** Reply-to inbox shown to the client (e.g. `info@7eightdev.com`). */
  readonly replyTo: string;
  /** Public origin used to build the quote link, no trailing slash. */
  readonly appBaseUrl: string;
}

/**
 * Adapter: delivers quote notifications via Resend.
 *
 * Provider-specific concerns (API key, sender identity, link origin) live
 * here, never in the domain or the use case. The email body is intentionally
 * a clean text + minimal-HTML message with a single CTA — the fully branded
 * React Email template is a separate piece of work and will replace
 * {@link renderEmail} without touching this contract.
 */
export class ResendQuoteNotificationAdapter implements QuoteNotificationPort {
  private readonly client: Resend;

  constructor(private readonly config: ResendQuoteNotificationConfig) {
    this.client = new Resend(config.apiKey);
  }

  async notifyQuoteSent(quote: Quote): Promise<NotificationResult> {
    const to = quote.client.email?.trim();
    if (!to) {
      return { ok: false, error: "Il preventivo non ha un'email cliente." };
    }

    const publicUrl = `${this.config.appBaseUrl.replace(/\/+$/, "")}/p/${quote.id}`;
    const { subject, html, text } = renderEmail(quote, publicUrl);

    try {
      const { data, error } = await this.client.emails.send({
        from: this.config.from,
        to,
        replyTo: this.config.replyTo,
        subject,
        html,
        text,
      });

      if (error) {
        return { ok: false, error: error.message };
      }
      if (!data?.id) {
        return { ok: false, error: "Resend non ha restituito un id messaggio." };
      }
      return { ok: true, messageId: data.id };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return { ok: false, error: `Invio Resend non riuscito: ${message}` };
    }
  }
}

/** Minimal, deliverability-friendly body. Replaced later by a branded template. */
function renderEmail(
  quote: Quote,
  publicUrl: string
): { subject: string; html: string; text: string } {
  const name = quote.client.name;
  const project = quote.project;
  const subject = `Il tuo preventivo da 7eightDev — ${quote.number}`;

  const text = [
    `Ciao ${name},`,
    "",
    `trovi qui il preventivo per "${project}" (${quote.number}).`,
    "Puoi consultarlo e accettarlo a questo link:",
    publicUrl,
    "",
    "Per qualsiasi domanda rispondi pure a questa email.",
    "",
    "7eightDev",
  ].join("\n");

  const html = `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:16px;">Ciao ${escapeHtml(name)},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
          trovi qui il preventivo per <strong>${escapeHtml(project)}</strong>
          (${escapeHtml(quote.number)}). Puoi consultarlo e accettarlo online:
        </p>
        <p style="margin:24px 0;">
          <a href="${publicUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;">
            Apri il preventivo
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.5;">
          Se il pulsante non funziona, copia questo link nel browser:<br />
          <a href="${publicUrl}" style="color:#3f3f46;">${publicUrl}</a>
        </p>
        <p style="margin:24px 0 0;font-size:14px;color:#52525b;">
          Per qualsiasi domanda rispondi pure a questa email.<br />— 7eightDev
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
