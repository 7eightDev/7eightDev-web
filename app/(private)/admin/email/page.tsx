import { notFound } from "next/navigation";
import type { Quote } from "@/domain/quote/quote.types";
import { quoteRepository } from "@/infrastructure/container";
import { EMAIL_SCENARIOS } from "@/infrastructure/quote/email-preview.fixtures";
import {
  renderAcceptedEmail,
  renderEmail,
} from "@/infrastructure/quote/resend-quote-notification.adapter";
import { Container } from "@/presentation/components/shared/container";
import {
  EmailPreviewPanel,
  type RenderedScenario,
} from "@/presentation/features/admin/email-preview-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anteprima email — 7eightDev" };

/**
 * Dev-only email preview & test-send tool. 404s in production so it never
 * ships on the live site (auth is also enforced by the Clerk proxy on
 * the `(private)` area).
 *
 * Renders both synthetic fixtures and real quotes from the DB. `?quote=<id>`
 * deep-links to a specific quote (used by the row actions on the quote list)
 * so you can verify how a quote looks before sending it.
 */
export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { quote: focusQuoteId } = await searchParams;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const defaultRecipient =
    process.env.QUOTE_ACCEPT_NOTIFY_TO?.trim() || "7eightdev@gmail.com";

  const renderSent = (quote: Quote) => {
    const publicUrl = `${appBaseUrl.replace(/\/+$/, "")}/p/${quote.id}`;
    return renderEmail(quote, publicUrl, appBaseUrl);
  };

  // Only the deep-linked quote is loaded (from the row actions drawer) — the
  // page intentionally does NOT list every quote. Without `?quote`, just demos.
  const focusQuote = focusQuoteId
    ? await quoteRepository.findById(focusQuoteId)
    : null;
  const realScenarios: RenderedScenario[] = focusQuote
    ? [
        (() => {
          const rendered = renderSent(focusQuote);
          return {
            id: `quote:${focusQuote.id}`,
            label: `Reale · ${focusQuote.number} · ${focusQuote.client.name}`,
            kind: "sent" as const,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          };
        })(),
      ]
    : [];

  const fixtureScenarios: RenderedScenario[] = EMAIL_SCENARIOS.map((s) => {
    const publicUrl = `${appBaseUrl.replace(/\/+$/, "")}/p/${s.quote.id}`;
    const rendered =
      s.kind === "accepted"
        ? renderAcceptedEmail(s.quote, publicUrl, appBaseUrl)
        : renderEmail(s.quote, publicUrl, appBaseUrl);
    return {
      id: `fixture:${s.id}`,
      label: `Demo · ${s.label}`,
      kind: s.kind,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  });

  const scenarios = [...realScenarios, ...fixtureScenarios];
  const initialId = focusQuoteId
    ? `quote:${focusQuoteId}`
    : (scenarios[0]?.id ?? "");

  return (
    <Container className="max-w-[900px] py-10">
      <div className="mb-6">
        <h1 className="font-space text-2xl font-bold text-foreground m-0">
          Anteprima email
        </h1>
        <p className="font-hanken text-sm text-muted mt-2 m-0">
          Strumento di sviluppo: anteprima e invio di test da preventivi reali o
          scenari finti, senza creare né modificare alcun preventivo.
        </p>
      </div>
      <EmailPreviewPanel
        scenarios={scenarios}
        defaultRecipient={defaultRecipient}
        initialId={initialId}
      />
    </Container>
  );
}
