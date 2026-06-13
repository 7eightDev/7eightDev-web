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
  /**
   * Owner inbox that receives the "quote accepted" operational alert
   * (e.g. `7eightdev@gmail.com`). Distinct from {@link replyTo}, which is the
   * client-facing reply address.
   */
  readonly ownerInbox: string;
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

  async notifyQuoteAccepted(quote: Quote): Promise<NotificationResult> {
    const publicUrl = `${this.config.appBaseUrl.replace(/\/+$/, "")}/p/${quote.id}`;
    const { subject, html, text } = renderAcceptedEmail(quote, publicUrl);

    try {
      const { data, error } = await this.client.emails.send({
        from: this.config.from,
        to: this.config.ownerInbox,
        replyTo: quote.client.email?.trim() || this.config.replyTo,
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

/**
 * Owner-facing "quote accepted" alert. Plain text + minimal HTML, same
 * deliverability stance as {@link renderEmail}; a branded template can replace
 * this without touching the adapter contract.
 */
function renderAcceptedEmail(
  quote: Quote,
  publicUrl: string
): { subject: string; html: string; text: string } {
  const acceptance = quote.acceptance;
  const acceptedBy = acceptance?.acceptedByName ?? quote.client.name;
  const company = quote.client.company ? ` (${quote.client.company})` : "";
  const acceptedAt = acceptance
    ? new Date(acceptance.acceptedAt).toLocaleString("it-IT", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Rome",
      })
    : "—";

  const selectedTitles = quote.lineItems
    .filter(
      (item) =>
        item.optional &&
        acceptance?.selectedOptionalIds.includes(item.id)
    )
    .map((item) => item.title);
  const optionsLine =
    selectedTitles.length > 0
      ? selectedTitles.join(", ")
      : "Nessuna opzione facoltativa selezionata";

  const subject = `✅ Preventivo ${quote.number} accettato — ${acceptedBy}`;

  const text = [
    `Il preventivo ${quote.number} è stato accettato.`,
    "",
    `Cliente: ${quote.client.name}${quote.client.company ? ` (${quote.client.company})` : ""}`,
    `Progetto: ${quote.project}`,
    `Accettato da: ${acceptedBy}`,
    `Data: ${acceptedAt}`,
    `Opzioni selezionate: ${optionsLine}`,
    acceptance?.ipAddress ? `IP: ${acceptance.ipAddress}` : "",
    "",
    `Apri il preventivo: ${publicUrl}`,
    "",
    "— 7eightDev",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;">
          ✅ Preventivo ${escapeHtml(quote.number)} accettato
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:#3f3f46;">
          <tr><td style="padding:2px 0;"><strong>Cliente:</strong> ${escapeHtml(quote.client.name)}${escapeHtml(company)}</td></tr>
          <tr><td style="padding:2px 0;"><strong>Progetto:</strong> ${escapeHtml(quote.project)}</td></tr>
          <tr><td style="padding:2px 0;"><strong>Accettato da:</strong> ${escapeHtml(acceptedBy)}</td></tr>
          <tr><td style="padding:2px 0;"><strong>Data:</strong> ${escapeHtml(acceptedAt)}</td></tr>
          <tr><td style="padding:2px 0;"><strong>Opzioni selezionate:</strong> ${escapeHtml(optionsLine)}</td></tr>
          ${acceptance?.ipAddress ? `<tr><td style="padding:2px 0;"><strong>IP:</strong> ${escapeHtml(acceptance.ipAddress)}</td></tr>` : ""}
        </table>
        <p style="margin:24px 0;">
          <a href="${publicUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;">
            Apri il preventivo
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:14px;color:#52525b;">— 7eightDev</p>
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
