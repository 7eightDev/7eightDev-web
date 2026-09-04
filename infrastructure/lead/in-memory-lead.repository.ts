import type {
  LeadPage,
  LeadPageParams,
  LeadRepository
} from '@/domain/lead/lead.repository';
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

  async findPaginated({
    page,
    pageSize,
    status,
    source,
    q
  }: LeadPageParams): Promise<LeadPage> {
    let filtered = [...this.leads.values()];

    if (status && status !== 'all') {
      filtered = filtered.filter((l) => l.status === status);
    }
    if (source && source !== 'all') {
      filtered = filtered.filter((l) => l.source === source);
    }
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((l) => {
        const haystack = [
          l.companyName,
          l.city,
          l.category,
          l.website,
          l.phone,
          l.email
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    filtered.sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const leads = filtered.slice(start, start + pageSize);

    return { leads, total };
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

  async findLatestAnalysesByLeadIds(leadIds: string[]): Promise<LeadAnalysis[]> {
    const idSet = new Set(leadIds);
    const byLead = new Map<string, LeadAnalysis>();

    for (const a of this.analyses.values()) {
      if (!idSet.has(a.leadId)) continue;
      const existing = byLead.get(a.leadId);
      if (!existing || a.analyzedAt > existing.analyzedAt) {
        byLead.set(a.leadId, a);
      }
    }

    return [...byLead.values()];
  }

  async saveAnalysis(analysis: LeadAnalysis): Promise<void> {
    this.analyses.set(analysis.id, analysis);
  }

  async findJobById(id: string): Promise<LeadGenerationJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findAllJobs(): Promise<LeadGenerationJob[]> {
    return [...this.jobs.values()];
  }

  async saveJob(job: LeadGenerationJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
}
