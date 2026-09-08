import type { LeadRepository } from '@/domain/lead/lead.repository';
import {
  hasCriteria,
  leadMatchesCriteria
} from '@/domain/lead/lead.criteria';
import { leadMatchesYearRange } from '@/domain/lead/lead.copyright';
import type { Lead, LeadAnalysis } from '@/domain/lead/lead.types';
export const LEAD_CSV_HEADER = [
  'company',
  'category',
  'website',
  'phone',
  'email',
  'address',
  'city',
  'performance',
  'lcp',
  'fcp',
  'cls',
  'tbt',
  'qualification',
  'source'
].join(',');

/** Mirrors the filter dimensions of the leads page (job, status, source, q,
 *  tech, copyright year range), so the export matches exactly what is visible
 *  on screen. */
export interface LeadExportFilters {
  readonly status?: string;
  readonly source?: string;
  readonly q?: string;
  readonly jobId?: string;
  readonly techStack?: string[];
  readonly copyrightFrom?: number;
  readonly copyrightTo?: number;
}

/**
 * Exports the leads matching the given filters, joined with their most recent
 * PageSpeed analysis, as a CSV string (RFC 4180-ish: comma separator,
 * double-quote escaping, CRLF line endings for Excel compatibility).
 * Without filters it exports every lead, keeping the "qualification" column
 * truthful to each lead's real status.
 */
export async function exportLeadsCsv(
  repo: LeadRepository,
  filters: LeadExportFilters = {}
): Promise<string> {
  const leads = await repo.findMatchingLeads({
    status: filters.status,
    source: filters.source,
    q: filters.q,
    jobId: filters.jobId
  });

  // A job's tech/copyright criteria act as a view filter (never destructive):
  // the export mirrors the on-screen list, non-matching leads stay stored.
  const job = filters.jobId ? await repo.findJobById(filters.jobId) : null;
  const jobCriteriaLeads =
    job && hasCriteria(job)
      ? leads.filter((lead) => leadMatchesCriteria(lead, job))
      : leads;

  // Additional in-memory filters: tech-stack multiselect (any-of) and the
  // copyright year range.
  const criteriaLeads = jobCriteriaLeads.filter((lead) => {
    if (filters.techStack && filters.techStack.length > 0) {
      const leadTechs = (lead.techStack ?? []).map((t) => t.toLowerCase());
      const hit = filters.techStack.some((t) =>
        leadTechs.some((lt) => lt.includes(t.toLowerCase()))
      );
      if (!hit) return false;
    }
    if (
      !leadMatchesYearRange(
        lead,
        filters.copyrightFrom,
        filters.copyrightTo
      )
    ) {
      return false;
    }
    return true;
  });

  const rows = await Promise.all(
    criteriaLeads.map(async (lead) => {
      const analyses = await repo.findAnalysesByLeadId(lead.id);
      const latest = mostRecent(analyses);
      return toRow(lead, latest);
    })
  );

  return [LEAD_CSV_HEADER, ...rows].join('\r\n') + '\r\n';
}

function toRow(lead: Lead, analysis: LeadAnalysis | undefined): string {
  return [
    lead.companyName,
    lead.category,
    lead.website,
    lead.phone,
    lead.email,
    lead.address,
    lead.city,
    analysis?.performanceScore,
    analysis?.lcp,
    analysis?.fcp,
    analysis?.cls,
    analysis?.tbt,
    lead.status,
    lead.source
  ]
    .map(csvCell)
    .join(',');
}

function mostRecent(
  analyses: LeadAnalysis[]
): LeadAnalysis | undefined {
  return analyses.sort(
    (a, b) =>
      new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  )[0];
}

function csvCell(value: unknown): string {
  const text =
    value === undefined || value === null ? '' : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}