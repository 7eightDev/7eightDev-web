import type { LeadRepository } from "@/domain/lead/lead.repository";
import type { LeadReportPort } from "@/domain/lead/lead-report.port";
import type { LeadNotificationPort } from "@/domain/lead/lead-notification.port";

export interface SendLeadPresentationDeps {
  readonly leadRepository: LeadRepository;
  readonly reportGenerator: LeadReportPort;
  readonly notifier: LeadNotificationPort;
  readonly now?: () => Date;
}

export type SendLeadPresentationResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: the value-first outreach email. Generates the PDF report, sends
 * it to the client (or an explicit recipient) with the presentation email,
 * and — only on confirmed delivery — moves the lead from `not_contacted` to
 * `audit_sent` and stamps `lastContactedAt`. A failed delivery never marks the
 * lead as contacted, so the send stays retryable.
 */
export async function sendLeadPresentation(
  deps: SendLeadPresentationDeps,
  leadId: string,
  to?: string
): Promise<SendLeadPresentationResult> {
  const lead = await deps.leadRepository.findById(leadId);
  if (!lead) return { ok: false, error: "Lead non trovato." };

  const recipient = (to ?? lead.email ?? "").trim();
  if (!recipient) {
    return {
      ok: false,
      error: "Il lead non ha un indirizzo email a cui inviare l'audit.",
    };
  }

  const analyses = await deps.leadRepository.findAnalysesByLeadId(leadId);
  const latest = analyses[0];
  if (!latest) {
    return { ok: false, error: "Nessuna analisi disponibile per questo lead." };
  }

  const now = deps.now ?? (() => new Date());

  let report;
  try {
    report = await deps.reportGenerator.generateReport({
      lead,
      analysis: latest,
      generatedAt: now().toISOString(),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Generazione del report non riuscita: ${message}` };
  }

  const delivery = await deps.notifier.sendPresentationEmail({
    lead,
    analysis: latest,
    reportPdf: report.pdf,
    reportFilename: report.filename,
    to: recipient,
  });
  if (!delivery.ok) return delivery;

  // Delivery confirmed: transition to "audit sent" (never downgrade a lead
  // that was already further along the funnel) and stamp the touchpoint.
  const timestamp = now().toISOString();
  await deps.leadRepository.save({
    ...lead,
    outreachStatus:
      lead.outreachStatus === "not_contacted" ? "audit_sent" : lead.outreachStatus,
    lastContactedAt: timestamp,
    updatedAt: timestamp,
  });

  return { ok: true, messageId: delivery.messageId };
}