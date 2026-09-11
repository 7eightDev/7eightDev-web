"use server";

import { revalidatePath } from "next/cache";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import type { LeadNotificationResult } from "@/domain/lead/lead-notification.port";
import { sendLeadPresentation } from "@/application/lead/send-lead-presentation";
import { leadIdSchema } from "@/application/lead/lead.schemas";
import {
  emailConfigFromEnv,
  leadNotifier,
  leadReportGenerator,
  leadRepository,
} from "@/infrastructure/container";
import {
  findLeadReportScenario,
  type LeadReportScenario,
} from "@/infrastructure/lead/lead-email-preview.fixtures";
import { ResendLeadNotificationAdapter } from "@/infrastructure/lead/notification/resend-lead-notification.adapter";
import { PuppeteerLeadReportAdapter } from "@/infrastructure/lead/report/puppeteer-report.adapter";

const isProd = process.env.NODE_ENV === "production";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SendLeadEmailResult {
  readonly ok: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

type LeadSelection =
  | { scenario: LeadReportScenario }
  | { error: string };

/**
 * Resolves a selection id to lead + analysis.
 * - `lead:<uuid>` → a real lead with its latest analysis (loads from the DB).
 * - `fixture:<id>` → a synthetic preview scenario.
 */
async function resolveLeadSelection(
  selectionId: string
): Promise<LeadSelection> {
  if (selectionId.startsWith("lead:")) {
    const leadId = selectionId.slice("lead:".length);
    const lead = await leadRepository.findById(leadId);
    if (!lead) return { error: "Lead non trovato." };
    const analyses = await leadRepository.findAnalysesByLeadId(leadId);
    const latest = analyses[0];
    if (!latest) return { error: "Nessuna analisi disponibile per questo lead." };
    return { scenario: { id: `lead:${leadId}`, label: lead.companyName, lead, analysis: latest } };
  }

  const fixtureId = selectionId.startsWith("fixture:")
    ? selectionId.slice("fixture:".length)
    : selectionId;
  const scenario = findLeadReportScenario(fixtureId);
  if (!scenario) return { error: "Scenario non trovato." };
  return { scenario };
}

async function renderAndSend({
  lead,
  analysis,
  reportPdf,
  reportFilename,
  to,
}: {
  lead: Lead;
  analysis: LeadAnalysis;
  reportPdf: Buffer;
  reportFilename: string;
  to: string;
}): Promise<LeadNotificationResult> {
  const config = emailConfigFromEnv();
  if (!config) {
    return {
      ok: false,
      error:
        "Configurazione email mancante (RESEND_API_KEY / QUOTE_FROM_EMAIL / QUOTE_REPLY_TO / APP_BASE_URL).",
    };
  }
  const adapter = new ResendLeadNotificationAdapter({
    apiKey: config.apiKey,
    from: config.from,
    replyTo: config.replyTo,
    appBaseUrl: config.appBaseUrl,
  });
  return adapter.sendPresentationEmail({
    lead,
    analysis,
    reportPdf,
    reportFilename,
    to,
  });
}

/**
 * Dev-only: renders + test-sends the presentation email (with the real PDF
 * report attached) to an arbitrary address — without creating anything and
 * without touching the lead's outreach status. Same role as the quote email
 * test tool: a deliverability/rendering check, not a domain operation.
 *
 * Auth is enforced by the Clerk proxy (the page lives under the protected
 * `(private)` area); this guard adds defense-in-depth against prod exposure.
 */
export async function sendLeadTestEmailAction(
  selectionId: string,
  to: string
): Promise<SendLeadEmailResult> {
  if (isProd) {
    return { ok: false, error: "Strumento disponibile solo in sviluppo." };
  }

  const recipient = to.trim();
  if (!EMAIL_RE.test(recipient)) {
    return { ok: false, error: "Indirizzo email destinatario non valido." };
  }

  const selection = await resolveLeadSelection(selectionId);
  if ("error" in selection) {
    return { ok: false, error: selection.error };
  }

  let report;
  try {
    report = await new PuppeteerLeadReportAdapter().generateReport({
      lead: selection.scenario.lead,
      analysis: selection.scenario.analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Generazione del report non riuscita: ${message}` };
  }

  const delivery = await renderAndSend({
    lead: selection.scenario.lead,
    analysis: selection.scenario.analysis,
    reportPdf: report.pdf,
    reportFilename: report.filename,
    to: recipient,
  });
  return delivery.ok
    ? { ok: true, messageId: delivery.messageId }
    : { ok: false, error: delivery.error };
}

/**
 * Production-capable: sends the presentation email to the lead's client (or an
 * explicit recipient) and, on confirmed delivery, moves the lead to
 * `audit_sent` with a fresh `lastContactedAt`.
 */
export async function sendLeadPresentationAction(
  leadId: string,
  to?: string
): Promise<SendLeadEmailResult> {
  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const delivery = await sendLeadPresentation(
    {
      leadRepository,
      reportGenerator: leadReportGenerator,
      notifier: leadNotifier,
    },
    parsed.data,
    to
  );

  if (delivery.ok) revalidatePath("/admin/leads");
  return delivery;
}