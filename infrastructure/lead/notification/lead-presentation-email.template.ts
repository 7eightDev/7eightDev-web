import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { emailAssetsBaseUrl } from "@/infrastructure/shared/email-assets-url";

/**
 * Value-first "presentation" email sent to a potential client together with
 * the attached PDF audit report. Hand-written HTML + inline styles, same
 * deliverability stance as the quote emails. Provider-agnostic: this is pure
 * rendering, the delivery contract lives in {@link LeadNotificationPort}.
 */

export interface LeadPresentationEmailRender {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export function renderLeadPresentationEmail(
  lead: Lead,
  analysis: LeadAnalysis,
  reportFilename: string,
  appBaseUrl: string
): LeadPresentationEmailRender {
  const company = lead.companyName;
  const domain = displayDomain(lead.website ?? lead.companyName);
  const score = analysis.performanceScore;
  const lcp = analysis.lcp;

  const subject = `Audit performance sito web — ${company}`;

  const scoreLine =
    score !== undefined ? `${score} / 100` : "non disponibile";
  const lcpLine =
    lcp !== undefined
      ? `${formatSeconds(lcp)} (ideale ≤ 2,5 s)`
      : "non rilevato";
  const adsLine = lead.hasAds === true ? "Sì — campagne attive rilevate" : "No";

  const text = [
    `Gentile ${company},`,
    "",
    `prima di contattarti ho voluto guardare con attenzione il vostro sito (${domain}) per capire se posso esservi davvero utile: non vi prometto nulla, vi mostro i dati.`,
    "",
    `Ecco cosa ho rilevato con un'analisi automatica basata sui Core Web Vitals di Google:`,
    "",
    `• Performance score: ${scoreLine}`,
    `• Tempo di caricamento principale (LCP): ${lcpLine}`,
    `• Campagne pubblicitarie attive: ${adsLine}`,
    "",
    `Se fate pubblicità a pagamento, la lentezza del sito ha un costo diretto: una parte del budget va persa perché i visitatori abbandonano prima che la pagina finisca di caricare.`,
    "",
    `Nel report allegato (${reportFilename}) trovate l'analisi completa con i numeri, il dettaglio tecnico e una stima di quanto la situazione possa costarvi ogni mese.`,
    "",
    `Se i numeri vi interessano, rispondete a questa email: vi spiego senza impegno quali interventi recupererebbero clienti e budget.`,
    "",
    `Cordiali saluti,`,
    "7eightDev",
  ].join("\n");

  const inner = `
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#0F172A;">Gentile <strong style="color:#0F172A;">${escapeHtml(company)}</strong>,</p>
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#475569;">
      prima di contattarti ho voluto guardare con attenzione il vostro sito
      (<a href="${escapeHtml(lead.website ?? `https://${domain}`)}" style="color:#15803D;text-decoration:underline;text-underline-offset:2px;">${escapeHtml(domain)}</a>). Non vi prometto nulla —
      vi mostro i dati: ho eseguito un&apos;analisi automatica delle performance basata sui
      <strong style="color:#0F172A;">Core Web Vitals di Google</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:12px;">
      <tr><td style="padding:16px 20px;border-left:3px solid #15803D;border-radius:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${kpiRow("Performance score", scoreLine)}
          ${kpiRow("Caricamento principale (LCP)", lcpLine)}
          ${kpiRow("Campagne pubblicitarie attive", adsLine)}
        </table>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
      Se fate <strong style="color:#0F172A;">pubblicità a pagamento</strong>, la lentezza del sito ha un costo
      diretto: una parte del budget va persa perché i visitatori abbandonano prima che la pagina
      finisca di caricare e converte.
    </p>
    <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
      Nel <strong style="color:#15803D;">report allegato</strong> (${escapeHtml(reportFilename)}) trovate
      l&apos;analisi completa: i numeri, il dettaglio tecnico e una stima di quanto la situazione
      possa costarvi ogni mese.
    </p>
    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
      Se i numeri vi interessano, <strong style="color:#0F172A;">rispondete a questa email</strong>: vi spiego
      senza impegno quali interventi recupererebbero clienti e budget.
    </p>
    <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#475569;">
      Cordiali saluti,<br />— 7eightDev
    </p>`;

  return {
    subject,
    html: emailShell({ appBaseUrl, preheader: `Analisi gratuita del sito ${domain}.`, inner }),
    text,
  };
}

function kpiRow(label: string, value: string): string {
  return `
    <tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">
      <span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:normal;text-transform:uppercase;letter-spacing:0.5px;color:#6B7280;margin:0 0 3px;">${escapeHtml(label)}</span>
      <span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;font-weight:bold;color:#0F172A;">${escapeHtml(value)}</span>
    </td></tr>`;
}

function emailShell(opts: { appBaseUrl: string; preheader: string; inner: string }): string {
  const logo = `${emailAssetsBaseUrl(opts.appBaseUrl)}/icon-192.png`;
  // Fully light email: the brand header row and a white content card sit above
  // the client's own background; the brand green is swapped for a darker tone
  // that stays readable on white.
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
          <tr><td style="padding:0 4px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${logo}" width="36" height="36" alt="7eightDev" style="display:block;border-radius:8px;" />
              </td>
              <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;letter-spacing:-0.5px;color:#0F172A;">
                7eight<span style="color:#15803D;">Dev</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:32px;">
            ${opts.inner}
          </td></tr>
          <tr><td style="padding:20px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6B7280;">
            7eightDev · Engineering-first web &amp; software<br />
            Hai ricevuto questa email perché ti è stato inviato un audit di performance del tuo sito web.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function displayDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Client-friendly seconds, e.g. 4.831 → "4,8 s". */
function formatSeconds(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return `${rounded.toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} s`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}