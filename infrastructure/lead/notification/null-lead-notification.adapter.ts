import type {
  LeadNotificationPort,
  LeadNotificationResult,
  LeadPresentationEmailInput,
} from "@/domain/lead/lead-notification.port";

/**
 * Adapter: no-op notifier used when no email provider is configured
 * (local dev / demos without a Resend key, or CI). Reports success so the
 * outreach flow stays exercisable, and logs the would-be delivery.
 */
export class NullLeadNotificationAdapter implements LeadNotificationPort {
  async sendPresentationEmail(
    input: LeadPresentationEmailInput
  ): Promise<LeadNotificationResult> {
    console.warn(
      `[NullLeadNotificationAdapter] Nessun provider email configurato — ` +
        `invio simulato dell'audit di ${input.lead.companyName} ` +
        `(allegato: ${input.reportFilename}) a ${input.to}.`
    );
    return { ok: true, messageId: `null-${input.lead.id}` };
  }
}