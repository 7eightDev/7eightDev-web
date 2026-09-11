import { leadRepository } from "@/infrastructure/container";
import { LEAD_REPORT_SCENARIOS } from "@/infrastructure/lead/lead-email-preview.fixtures";
import { renderLeadReportHtml } from "@/infrastructure/lead/report/lead-report.template";
import { reportFilename } from "@/infrastructure/lead/report/puppeteer-report.adapter";
import { renderLeadPresentationEmail } from "@/infrastructure/lead/notification/lead-presentation-email.template";
import { formatDateIt } from "@/presentation/lib/format-date";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { Container } from "@/presentation/components/shared/container";
import {
  LeadReportPreviewPanel,
  type RenderedReportScenario,
} from "@/presentation/features/admin/leads/lead-report-preview-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anteprima report lead — 7eightDev" };

/**
 * Studio per il report audit + email di presentazione: anteprima del markup
 * PDF e dell'email, invio di test via Resend reale a un indirizzo qualsiasi e
 * download del PDF esatto. `?lead=<uuid>` apre un lead reale dal suo dettaglio;
 * senza query mostra gli scenari demo. L'invio di test resta dev-only (la
 * server action si auto-protegge in produzione); lo studio è raggiungibile in
 * ogni ambiente perché protetto da Clerk sotto `(private)`.
 */
export default async function LeadReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: focusLeadId } = await searchParams;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const defaultRecipient =
    process.env.QUOTE_ACCEPT_NOTIFY_TO?.trim() || "7eightdev@gmail.com";
  const generatedAt = new Date().toISOString();

  // Real lead first (from the row/detail deep link), then demo fixtures.
  const sourceScenarios: Array<{
    id: string;
    label: string;
    lead: Lead;
    analysis: LeadAnalysis;
  }> = [];

  if (focusLeadId) {
    const lead = await leadRepository.findById(focusLeadId);
    if (lead) {
      const analyses = await leadRepository.findAnalysesByLeadId(focusLeadId);
      const latest = analyses[0];
      if (latest) {
        sourceScenarios.push({
          id: `lead:${lead.id}`,
          label: `Reale · ${lead.companyName}`,
          lead,
          analysis: latest,
        });
      }
    }
  }

  for (const scenario of LEAD_REPORT_SCENARIOS) {
    sourceScenarios.push({
      id: `fixture:${scenario.id}`,
      label: `Demo · ${scenario.label}`,
      lead: scenario.lead,
      analysis: scenario.analysis,
    });
  }

  const scenarios: RenderedReportScenario[] = sourceScenarios.map((s) => {
    const filename = reportFilename({
      lead: s.lead,
      analysis: s.analysis,
      generatedAt,
    });
    const email = renderLeadPresentationEmail(
      s.lead,
      s.analysis,
      filename,
      appBaseUrl
    );
    return {
      id: s.id,
      label: s.label,
      subject: email.subject,
      emailHtml: email.html,
      text: email.text,
      reportHtml: renderLeadReportHtml({
        lead: s.lead,
        analysis: s.analysis,
        generatedAt,
      }),
      reportDate: formatDateIt(generatedAt),
      downloadHref: s.id.startsWith("lead:")
        ? `/admin/leads/report/pdf?lead=${encodeURIComponent(s.id.slice("lead:".length))}`
        : `/admin/leads/report/pdf?fixture=${encodeURIComponent(s.id.slice("fixture:".length))}`,
    };
  });

  const initialId = focusLeadId
    ? `lead:${focusLeadId}`
    : (scenarios[0]?.id ?? "");

  return (
    <Container className="max-w-[1440px] py-4 lg:h-full lg:flex lg:flex-col lg:min-h-0">
      <div className="mb-4">
        <h1 className="font-space text-2xl font-bold text-foreground m-0">
          Anteprima report lead
        </h1>
        <p className="font-hanken text-sm text-muted mt-1 m-0">
          Strumento di sviluppo: anteprima e invio di test dell&apos;audit PDF e
          dell&apos;email di presentazione, da lead reali o scenari finti, senza
          creare né modificare alcun dato.
        </p>
      </div>
      <LeadReportPreviewPanel
        scenarios={scenarios}
        defaultRecipient={defaultRecipient}
        initialId={initialId}
      />
    </Container>
  );
}