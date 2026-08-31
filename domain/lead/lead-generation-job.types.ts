export type LeadGenerationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface LeadGenerationJobProgress {
  totalFound: number;
  analyzed: number;
  qualified: number;
}

export interface LeadGenerationJob {
  id: string;
  query: string;
  location: string;
  status: LeadGenerationJobStatus;
  progress: LeadGenerationJobProgress;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadGenerationJobInput {
  query: string;
  location: string;
}

export interface UpdateLeadGenerationJobProgressInput {
  totalFound?: number;
  analyzed?: number;
  qualified?: number;
}
