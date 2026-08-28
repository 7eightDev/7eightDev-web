export type LeadSource = 'google_maps' | 'outscraper' | 'serpapi';

export type LeadStatus = 'new' | 'analyzed' | 'qualified' | 'discarded';

export interface Lead {
  readonly id: string;

  readonly companyName: string;
  readonly category?: string;

  readonly website?: string;
  readonly phone?: string;
  readonly email?: string;

  readonly address?: string;
  readonly city?: string;

  readonly source: LeadSource;
  readonly status: LeadStatus;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadAnalysis {
  readonly id: string;
  readonly leadId: string;

  readonly strategy: 'mobile' | 'desktop';

  readonly performanceScore?: number;
  readonly lcp?: number;
  readonly fcp?: number;
  readonly cls?: number;
  readonly tbt?: number;

  readonly analyzedAt: string;
}

export type LeadGenerationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface LeadGenerationJob {
  readonly id: string;

  readonly query: string;
  readonly location: string;

  readonly status: LeadGenerationJobStatus;

  readonly totalFound: number;
  readonly analyzed: number;
  readonly qualified: number;

  readonly startedAt?: string;
  readonly completedAt?: string;

  readonly error?: string;

  readonly createdAt: string;
}
