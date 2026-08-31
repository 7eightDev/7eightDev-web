import {
  LeadGenerationJob,
  CreateLeadGenerationJobInput,
  UpdateLeadGenerationJobProgressInput
} from './lead-generation-job.types';

export interface LeadGenerationJobRepository {
  create(input: CreateLeadGenerationJobInput): Promise<LeadGenerationJob>;
  findById(id: string): Promise<LeadGenerationJob | null>;
  updateStatus(
    id: string,
    status: LeadGenerationJob['status'],
    error?: string
  ): Promise<LeadGenerationJob>;
  updateProgress(
    id: string,
    progress: UpdateLeadGenerationJobProgressInput
  ): Promise<LeadGenerationJob>;
}
