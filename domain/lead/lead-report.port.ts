import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";

/**
 * Port: outbound lead report generation (PDF).
 *
 * Provider-agnostic on purpose — the domain knows only that "an analysis of a
 * lead can be rendered into a printable, branded PDF report", never *how*
 * (Puppeteer in-process, a hosted HTML-to-PDF service, an n8n workflow, Canva
 * Connect, NotebookLM…). Adapters live in `infrastructure/` and stay
 * swappable: swapping the provider is a binding change in the composition
 * root, not a rewrite of the use cases or the UI.
 */
export interface LeadReportData {
  readonly lead: Lead;
  /** Latest PageSpeed analysis of the lead (the one the report narrates). */
  readonly analysis: LeadAnalysis;
  /** ISO timestamp of generation, shown in the report header/footer. */
  readonly generatedAt: string;
}

export interface GeneratedReport {
  /** PDF bytes, ready to be emailed as an attachment or streamed/downloaded. */
  readonly pdf: Buffer;
  /** Safe filename for attachment/download, e.g. `audit-7eightdev-2026-09-10.pdf`. */
  readonly filename: string;
}

export interface LeadReportPort {
  /**
   * Render the analysis of a lead into a printable PDF report.
   * Implementations may throw on generation failure; the caller is expected to
   * translate exceptions into a user-facing, already-localized error.
   */
  generateReport(data: LeadReportData): Promise<GeneratedReport>;
}