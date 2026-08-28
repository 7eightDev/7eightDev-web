import type { LeadRepository } from '@/domain/lead/lead.repository';
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';

export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads = new Map<string, Lead>();
  private readonly analyses = new Map<string, LeadAnalysis>();
  private readonly jobs = new Map<string, LeadGenerationJob>();

  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) ?? null;
  }

  async findAll(): Promise<Lead[]> {
    return [...this.leads.values()];
  }

  async save(lead: Lead): Promise<void> {
    this.leads.set(lead.id, lead);
  }

  async delete(id: string): Promise<void> {
    this.leads.delete(id);
  }

  async findAnalysesByLeadId(leadId: string): Promise<LeadAnalysis[]> {
    return [...this.analyses.values()].filter(
      (analysis) => analysis.leadId === leadId
    );
  }

  async saveAnalysis(analysis: LeadAnalysis): Promise<void> {
    this.analyses.set(analysis.id, analysis);
  }

  async findJobById(id: string): Promise<LeadGenerationJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async saveJob(job: LeadGenerationJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
}
