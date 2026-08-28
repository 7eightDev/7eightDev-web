import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';
import {
  leadAnalysisToRow,
  leadGenerationJobToRow,
  leadToRow,
  rowToLead,
  rowToLeadAnalysis,
  rowToLeadGenerationJob
} from '@/infrastructure/lead/lead.mapper';

const lead: Lead = {
  id: 'lead-1',
  companyName: 'Acme',
  category: 'dentist',
  website: 'https://example.com',
  phone: '+39123456789',
  email: 'info@example.com',
  address: 'Via Roma 1',
  city: 'Padova',
  source: 'google_maps',
  status: 'new',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-28T10:01:00.000Z'
};

const analysis: LeadAnalysis = {
  id: 'analysis-1',
  leadId: 'lead-1',
  strategy: 'mobile',
  performanceScore: 42,
  lcp: 2.1,
  fcp: 1.4,
  cls: 0.08,
  tbt: 120,
  analyzedAt: '2026-08-28T10:05:00.000Z'
};

const job: LeadGenerationJob = {
  id: 'job-1',
  query: 'dentist',
  location: 'Padova',
  status: 'completed',
  totalFound: 20,
  analyzed: 18,
  qualified: 7,
  startedAt: '2026-08-28T10:00:00.000Z',
  completedAt: '2026-08-28T10:30:00.000Z',
  error: undefined,
  createdAt: '2026-08-28T10:00:00.000Z'
};

describe('Lead mapper', () => {
  it('round-trips a lead without losing information', () => {
    expect(rowToLead(leadToRow(lead))).toEqual(lead);
  });

  it('round-trips a lead analysis without losing information', () => {
    expect(rowToLeadAnalysis(leadAnalysisToRow(analysis))).toEqual(analysis);
  });

  it('round-trips a generation job without losing information', () => {
    expect(rowToLeadGenerationJob(leadGenerationJobToRow(job))).toEqual(job);
  });

  it('maps optional lead fields to null', () => {
    const minimal: Lead = {
      id: 'lead-2',
      companyName: 'Minimal',
      source: 'outscraper',
      status: 'new',
      createdAt: '2026-08-28T10:00:00.000Z',
      updatedAt: '2026-08-28T10:00:00.000Z'
    };

    const row = leadToRow(minimal);

    expect(row.category).toBeNull();
    expect(row.website).toBeNull();
    expect(row.phone).toBeNull();
    expect(row.email).toBeNull();
    expect(row.address).toBeNull();
    expect(row.city).toBeNull();
  });
});
