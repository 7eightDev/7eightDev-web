import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  findAll(): Promise<Lead[]>;
  save(lead: Lead): Promise<void>;
  delete(id: string): Promise<void>;

  findAnalysesByLeadId(leadId: string): Promise<LeadAnalysis[]>;
  saveAnalysis(analysis: LeadAnalysis): Promise<void>;

  findJobById(id: string): Promise<LeadGenerationJob | null>;
  findAllJobs(): Promise<LeadGenerationJob[]>;
  saveJob(job: LeadGenerationJob): Promise<void>;
}
