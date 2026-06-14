import { Resend } from "resend";
import { calculateQuote } from "@/application/quote/quote.service";
import type {
  NotificationResult,
  QuoteNotificationPort,
} from "@/domain/quote/quote-notification.port";
import type { Quote } from "@/domain/quote/quote.types";
import { formatMoney } from "@/domain/shared/money";

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
    const { subject, html, text } = renderEmail(quote, publicUrl, this.config.appBaseUrl);

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
    const { subject, html, text } = renderAcceptedEmail(quote, publicUrl, this.config.appBaseUrl);

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

/**
 * Branded client-facing "quote sent" email (dark, on-brand).
 * Lean by design: greeting, key figures (base total incl. VAT, recurring,
 * validity) and a single CTA — the full breakdown lives on the public page.
 */
export function renderEmail(
  quote: Quote,
  publicUrl: string,
  appBaseUrl: string
): { subject: string; html: string; text: string } {
  const name = quote.client.name;
  const project = quote.project;
  const subject = `Il tuo preventivo da 7eightDev — ${quote.number}`;

  // Optionals aren't selected yet at send time → this is the base figure.
  const calc = calculateQuote(quote);
  const total = formatMoney(calc.oneTimeTotal);
  const hasOptional = quote.lineItems.some((item) => item.optional);
  const monthly =
    calc.monthlyRecurring.amountCents > 0
      ? formatMoney(calc.monthlyRecurring)
      : null;
  const yearly =
    calc.yearlyRecurring.amountCents > 0
      ? formatMoney(calc.yearlyRecurring)
      : null;
  const validUntil = formatDateIt(quote.validUntil);
  // No partita IVA → prestazione occasionale: the quote is outside the scope of
  // VAT. Drive the label off the quote's vatRate so a 0 rate never prints "IVA".
  const vatIncluded = quote.vatRate > 0;
  const totalCaption = vatIncluded ? "Totale base · IVA inclusa" : "Totale base";
  const fiscalNote = vatIncluded
    ? null
    : "Operazione non soggetta a IVA — prestazione occasionale (art. 67 TUIR).";

  const text = [
    `Ciao ${name},`,
    "",
    `trovi qui il preventivo per "${project}" (${quote.number}).`,
    `${vatIncluded ? "Totale base (IVA inclusa)" : "Totale base"}: ${total}${hasOptional ? " — opzioni aggiuntive selezionabili nel preventivo" : ""}`,
    fiscalNote ?? "",
    monthly ? `Canone: ${monthly}/mese` : "",
    yearly ? `Canone: ${yearly}/anno` : "",
    `Valido fino al ${validUntil}.`,
    "",
    "Puoi consultarlo e accettarlo a questo link:",
    publicUrl,
    "",
    "Per qualsiasi domanda rispondi pure a questa email.",
    "",
    "7eightDev",
  ]
    .filter((line) => line !== "")
    .join("\n");

  // Plain <p> blocks so they sit inside the total cell (the green-bordered box),
  // not stray <tr> rows that email clients hoist out of the <td>.
  const recurringRows = [
    monthly
      ? `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#AAB2BF;">+ ${escapeHtml(monthly)} <span style="color:#6B7280;">/ mese</span></p>`
      : "",
    yearly
      ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#AAB2BF;">+ ${escapeHtml(yearly)} <span style="color:#6B7280;">/ anno</span></p>`
      : "",
  ].join("");

  const inner = `
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#EEF1F5;">Ciao ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#AAB2BF;">
      ecco il preventivo per <strong style="color:#EEF1F5;">${escapeHtml(project)}</strong>
      <span style="color:#6B7280;">(${escapeHtml(quote.number)})</span>. Puoi consultarlo, scegliere le opzioni e accettarlo online.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#16191F" style="background:#16191F;border:1px solid #23262E;border-radius:12px;">
      <tr><td style="padding:18px 20px;border-left:3px solid #C7F94E;border-radius:12px;">
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;">${escapeHtml(totalCaption)}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;color:#EEF1F5;">${escapeHtml(total)}</p>
        ${fiscalNote ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;">${escapeHtml(fiscalNote)}</p>` : ""}
        ${recurringRows}
        ${hasOptional ? `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;">Opzioni aggiuntive selezionabili direttamente nel preventivo.</p>` : ""}
        <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#AAB2BF;">Valido fino al <strong style="color:#EEF1F5;">${escapeHtml(validUntil)}</strong></p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr><td bgcolor="#C7F94E" style="background:#C7F94E;border-radius:10px;">
        <a href="${publicUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#0A0B0D;text-decoration:none;">Apri il preventivo →</a>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6B7280;">
      Se il pulsante non funziona, copia questo link nel browser:<br />
      <a href="${publicUrl}" style="color:#AAB2BF;word-break:break-all;">${publicUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#AAB2BF;">
      Per qualsiasi domanda rispondi pure a questa email.<br />— 7eightDev
    </p>`;

  return {
    subject,
    html: emailShell({
      appBaseUrl,
      preheader: `Preventivo ${quote.number} — totale base ${total}, valido fino al ${validUntil}.`,
      inner,
    }),
    text,
  };
}

/**
 * Owner-facing "quote accepted" alert. Plain text + minimal HTML, same
 * deliverability stance as {@link renderEmail}; a branded template can replace
 * this without touching the adapter contract.
 */
export function renderAcceptedEmail(
  quote: Quote,
  publicUrl: string,
  appBaseUrl: string
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
    "",
    `Apri il preventivo: ${publicUrl}`,
    "",
    "— 7eightDev",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const detailRows = [
    ["Cliente", `${quote.client.name}${company}`],
    ["Progetto", quote.project],
    ["Accettato da", acceptedBy],
    ["Data", acceptedAt],
    ["Opzioni selezionate", optionsLine],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 0 0;font-family:Arial,Helvetica,sans-serif;">
          <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6B7280;margin:0 0 3px;">${escapeHtml(label)}</span>
          <span style="display:block;font-size:15px;line-height:1.45;font-weight:bold;color:#EEF1F5;">${escapeHtml(value)}</span>
        </td></tr>`
    )
    .join("");

  const inner = `
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#EEF1F5;">
      <span style="color:#C7F94E;">✓</span> Preventivo ${escapeHtml(quote.number)} accettato
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#16191F" style="background:#16191F;border:1px solid #23262E;border-radius:12px;">
      <tr><td style="padding:16px 20px;border-left:3px solid #C7F94E;border-radius:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:36px 0 0;">
      <tr><td bgcolor="#C7F94E" style="background:#C7F94E;border-radius:10px;">
        <a href="${publicUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#0A0B0D;text-decoration:none;">Apri il preventivo →</a>
      </td></tr>
    </table>`;

  return {
    subject,
    html: emailShell({
      appBaseUrl,
      preheader: `${acceptedBy} ha accettato il preventivo ${quote.number}.`,
      inner,
    }),
    text,
  };
}

/** Shared dark, on-brand email layout: logo header + content card + footer. */
function emailShell(opts: {
  appBaseUrl: string;
  preheader: string;
  inner: string;
}): string {
  const logo = `${opts.appBaseUrl.replace(/\/+$/, "")}/icon-192.png`;
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
  </head>
  <body style="margin:0;padding:0;background:#0A0B0D;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0A0B0D" style="background:#0A0B0D;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
          <tr><td style="padding:0 4px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${logo}" width="36" height="36" alt="7eightDev" style="display:block;border-radius:8px;" />
              </td>
              <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;letter-spacing:-0.5px;color:#EEF1F5;">
                7eight<span style="color:#C7F94E;">Dev</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td bgcolor="#101216" style="background:#101216;border:1px solid #23262E;border-radius:16px;padding:32px;">
            ${opts.inner}
          </td></tr>
          <tr><td style="padding:20px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6B7280;">
            7eightDev · Engineering-first web &amp; software<br />
            Hai ricevuto questa email perché ti è stato inviato un preventivo.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Long Italian date in Europe/Rome, e.g. "30 giugno 2026". */
function formatDateIt(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
