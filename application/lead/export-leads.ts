import type { LeadRepository } from '@/domain/lead/lead.repository';
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

/**
 * Exports only the leads that are currently qualified, joined with their most
 * recent PageSpeed analysis, as a CSV string (RFC 4180-ish: comma separator,
 * double-quote escaping, CRLF line endings for Excel compatibility).
 */
export async function exportQualifiedLeadsCsv(
  repo: LeadRepository
): Promise<string> {
  const leads = (await repo.findAll()).filter(
    (lead) => lead.status === 'qualified'
  );

  const rows = await Promise.all(
    leads.map(async (lead) => {
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
    'qualified',
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
