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

/** Lead-level filters shared by the list view, export and the full match query. */
export interface LeadMatchParams {
  readonly status?: string;
  readonly source?: string;
  readonly jobId?: string;
  readonly q?: string;
}

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  findAll(): Promise<Lead[]>;
  findPaginated(params: LeadPageParams): Promise<LeadPage>;
  /** All leads passing the lead-level filters, newest first. Callers apply the
   *  read-model filters (score, sort) on the full set so pagination stays
   *  consistent across pages. */
  findMatchingLeads(params: LeadMatchParams): Promise<Lead[]>;
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
  /** Toggle the sidebar pin (star) on a job. */
  setJobFavorite(id: string, favorite: boolean): Promise<void>;
  /** Permanently delete a job; its leads keep their `jobId` unset (SetNull). */
  deleteJob(id: string): Promise<void>;
  /** Analyzed + qualified lead counts for the given jobs, keyed by job id. */
  getLeadCountsByJobIds(
    jobIds: string[]
  ): Promise<Map<string, { analyzed: number; qualified: number }>>;
}
