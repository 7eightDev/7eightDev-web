import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';

export interface LeadRow {
  id: string;
  companyName: string;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  source: Lead['source'];
  status: Lead['status'];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadAnalysisRow {
  id: string;
  leadId: string;
  strategy: LeadAnalysis['strategy'];
  performanceScore: number | null;
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  tbt: number | null;
  analyzedAt: Date;
}

export interface LeadGenerationJobRow {
  id: string;
  query: string;
  location: string;
  status: LeadGenerationJob['status'];
  totalFound: number;
  analyzed: number;
  qualified: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    companyName: row.companyName,
    category: row.category ?? undefined,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function leadToRow(lead: Lead): LeadRow {
  return {
    id: lead.id,
    companyName: lead.companyName,
    category: lead.category ?? null,
    website: lead.website ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    address: lead.address ?? null,
    city: lead.city ?? null,
    source: lead.source,
    status: lead.status,
    createdAt: new Date(lead.createdAt),
    updatedAt: new Date(lead.updatedAt)
  };
}

export function rowToLeadAnalysis(row: LeadAnalysisRow): LeadAnalysis {
  return {
    id: row.id,
    leadId: row.leadId,
    strategy: row.strategy,
    performanceScore: row.performanceScore ?? undefined,
    lcp: row.lcp ?? undefined,
    fcp: row.fcp ?? undefined,
    cls: row.cls ?? undefined,
    tbt: row.tbt ?? undefined,
    analyzedAt: row.analyzedAt.toISOString()
  };
}

export function leadAnalysisToRow(analysis: LeadAnalysis): LeadAnalysisRow {
  return {
    id: analysis.id,
    leadId: analysis.leadId,
    strategy: analysis.strategy,
    performanceScore: analysis.performanceScore ?? null,
    lcp: analysis.lcp ?? null,
    fcp: analysis.fcp ?? null,
    cls: analysis.cls ?? null,
    tbt: analysis.tbt ?? null,
    analyzedAt: new Date(analysis.analyzedAt)
  };
}

export function rowToLeadGenerationJob(
  row: LeadGenerationJobRow
): LeadGenerationJob {
  return {
    id: row.id,
    query: row.query,
    location: row.location,
    status: row.status,
    totalFound: row.totalFound,
    analyzed: row.analyzed,
    qualified: row.qualified,
    startedAt: row.startedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    error: row.error ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
}

export function leadGenerationJobToRow(
  job: LeadGenerationJob
): LeadGenerationJobRow {
  return {
    id: job.id,
    query: job.query,
    location: job.location,
    status: job.status,
    totalFound: job.totalFound,
    analyzed: job.analyzed,
    qualified: job.qualified,
    startedAt: job.startedAt ? new Date(job.startedAt) : null,
    completedAt: job.completedAt ? new Date(job.completedAt) : null,
    error: job.error ?? null,
    createdAt: new Date(job.createdAt)
  };
}
