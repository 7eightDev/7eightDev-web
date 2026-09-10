import { Resend } from "resend";
import type {
  LeadNotificationPort,
  LeadNotificationResult,
  LeadPresentationEmailInput,
} from "@/domain/lead/lead-notification.port";
import { renderLeadPresentationEmail } from "@/infrastructure/lead/notification/lead-presentation-email.template";

export interface ResendLeadNotificationConfig {
  /** Resend API key (server-only secret). */
  readonly apiKey: string;
  /** Sender, friendly format: `"7eightDev <preventivi@send.7eightdev.com>"`. */
  readonly from: string;
  /** Reply-to inbox shown to the recipient (e.g. `info@7eightdev.com`). */
  readonly replyTo: string;
  /** Public origin used to build asset links, no trailing slash. */
  readonly appBaseUrl: string;
}

/**
 * Adapter: delivers the lead presentation email (with the attached PDF report)
 * via Resend. Provider-specific concerns (API key, sender identity) live here,
 * never in the domain or the use case. Swappable behind {@link LeadNotificationPort}.
 */
export class ResendLeadNotificationAdapter implements LeadNotificationPort {
  private readonly client: Resend;

  constructor(private readonly config: ResendLeadNotificationConfig) {
    this.client = new Resend(config.apiKey);
  }

  async sendPresentationEmail(
    input: LeadPresentationEmailInput
  ): Promise<LeadNotificationResult> {
    const to = input.to.trim();
    if (!to) {
      return { ok: false, error: "Indirizzo email destinatario mancante." };
    }

    const { subject, html, text } = renderLeadPresentationEmail(
      input.lead,
      input.analysis,
      input.reportFilename,
      this.config.appBaseUrl
    );

    try {
      const { data, error } = await this.client.emails.send({
        from: this.config.from,
        to,
        replyTo: this.config.replyTo,
        subject,
        html,
        text,
        attachments: [
          {
            filename: input.reportFilename,
            content: input.reportPdf,
          },
        ],
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