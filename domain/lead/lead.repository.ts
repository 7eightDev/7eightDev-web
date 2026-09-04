import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';

export interface LeadPageParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: string;
  readonly source?: string;
  readonly jobId?: string;
  readonly q?: string;
}

export interface LeadPage {
  readonly leads: Lead[];
  readonly total: number;
}

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  findAll(): Promise<Lead[]>;
  findPaginated(params: LeadPageParams): Promise<LeadPage>;
  countLeadsByJobIds(jobIds: string[]): Promise<Map<string, number>>;
  save(lead: Lead): Promise<void>;
  delete(id: string): Promise<void>;

  findAnalysesByLeadId(leadId: string): Promise<LeadAnalysis[]>;
  findLatestAnalysesByLeadIds(leadIds: string[]): Promise<LeadAnalysis[]>;
  saveAnalysis(analysis: LeadAnalysis): Promise<void>;

  existsByWebsiteKey(websiteKey: string): Promise<boolean>;
  findByWebsiteKey(websiteKey: string): Promise<Lead | null>;
  existsLeadByCompanyInJob(
    jobId: string,
    companyName: string,
    city: string | undefined
  ): Promise<boolean>;

  findJobById(id: string): Promise<LeadGenerationJob | null>;
  findAllJobs(): Promise<LeadGenerationJob[]>;
  saveJob(job: LeadGenerationJob): Promise<void>;
}
