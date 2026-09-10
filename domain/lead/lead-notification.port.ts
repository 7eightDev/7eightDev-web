import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";

/**
 * Port: outbound lead outreach email (the value-first "presentation" email).
 *
 * A potential client receives a first contact that introduces the analysis and
 * attaches the generated PDF report. Provider-agnostic on purpose — the domain
 * knows the message is "an email to a lead with the PDF attached", never how it
 * is delivered (Resend, SMTP, an n8n workflow…). Adapters live in
 * `infrastructure/lead/notification/` and stay swappable.
 */
export interface LeadPresentationEmailInput {
  readonly lead: Lead;
  readonly analysis: LeadAnalysis;
  readonly reportPdf: Buffer;
  readonly reportFilename: string;
  /** Explicit recipient override (test-sends to an arbitrary address). */
  readonly to: string;
}

export type LeadNotificationResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly error: string };

export interface LeadNotificationPort {
  /**
   * Deliver the presentation email with the attached report.
   * Implementations must never throw on expected delivery failures — they
   * return an `ok: false` result so the caller can keep the lead in a
   * re-sendable state (outreach not yet marked as sent).
   */
  sendPresentationEmail(
    input: LeadPresentationEmailInput
  ): Promise<LeadNotificationResult>;
}