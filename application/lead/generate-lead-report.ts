import type { LeadRepository } from "@/domain/lead/lead.repository";
import type {
  GeneratedReport,
  LeadReportPort,
} from "@/domain/lead/lead-report.port";

export interface GenerateLeadReportDeps {
  readonly leadRepository: LeadRepository;
  readonly reportGenerator: LeadReportPort;
  readonly now?: () => Date;
}

export type GenerateLeadReportResult =
  | { readonly ok: true; readonly report: GeneratedReport }
  | { readonly ok: false; readonly error: string };

/**
 * Use case: load a lead with its latest analysis and render the branded PDF
 * report. Pure orchestration — data access via the repository port, rendering
 * via the report port, so the provider stays swappable.
 */
export async function generateLeadReport(
  deps: GenerateLeadReportDeps,
  leadId: string
): Promise<GenerateLeadReportResult> {
  const lead = await deps.leadRepository.findById(leadId);
  if (!lead) return { ok: false, error: "Lead non trovato." };

  const analyses = await deps.leadRepository.findAnalysesByLeadId(leadId);
  const latest = analyses[0];
  if (!latest) {
    return { ok: false, error: "Nessuna analisi disponibile per questo lead." };
  }

  try {
    const generatedAt = (deps.now ?? (() => new Date()))().toISOString();
    const report = await deps.reportGenerator.generateReport({
      lead,
      analysis: latest,
      generatedAt,
    });
    return { ok: true, report };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Generazione del report non riuscita: ${message}` };
  }
}