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
    jobId,
    q
  }: LeadPageParams): Promise<LeadPage> {
    let filtered = [...this.leads.values()];

    if (status && status !== 'all') {
      filtered = filtered.filter((l) => l.status === status);
    }
    if (source && source !== 'all') {
      filtered = filtered.filter((l) => l.source === source);
    }
    if (jobId) {
      filtered = filtered.filter((l) => l.jobId === jobId);
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

  async countLeadsByJobIds(jobIds: string[]): Promise<Map<string, number>> {
    const set = new Set(jobIds);
    const counts = new Map<string, number>();
    for (const lead of this.leads.values()) {
      if (lead.jobId && set.has(lead.jobId)) {
        counts.set(lead.jobId, (counts.get(lead.jobId) ?? 0) + 1);
      }
    }
    return counts;
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

  async existsByWebsiteKey(key: string): Promise<boolean> {
    for (const lead of this.leads.values()) {
      if (inMemoryWebsiteKey(lead.website) === key) return true;
    }
    return false;
  }

  async findByWebsiteKey(key: string): Promise<Lead | null> {
    for (const lead of this.leads.values()) {
      if (inMemoryWebsiteKey(lead.website) === key) return lead;
    }
    return null;
  }

  async existsLeadByCompanyInJob(
    jobId: string,
    companyName: string,
    city: string | undefined
  ): Promise<boolean> {
    for (const lead of this.leads.values()) {
      if (
        lead.jobId === jobId &&
        lead.companyName.toLowerCase() === companyName.toLowerCase() &&
        (lead.city ?? undefined) === (city ?? undefined)
      ) {
        return true;
      }
    }
    return false;
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
    const current = this.jobs.get(job.id);
    // Preserve the persisted pin: pipeline progress saves never manage it.
    this.jobs.set(job.id, {
      ...job,
      favorite: job.favorite ?? current?.favorite ?? false
    });
  }

  async setJobFavorite(id: string, favorite: boolean): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, favorite });
    }
  }

  async deleteJob(id: string): Promise<void> {
    this.jobs.delete(id);
  }

  async getLeadCountsByJobIds(
    jobIds: string[]
  ): Promise<Map<string, { analyzed: number; qualified: number }>> {
    const set = new Set(jobIds);
    const result = new Map<string, { analyzed: number; qualified: number }>();
    for (const jobId of jobIds) result.set(jobId, { analyzed: 0, qualified: 0 });
    for (const lead of this.leads.values()) {
      if (!lead.jobId || !set.has(lead.jobId)) continue;
      const entry = result.get(lead.jobId);
      if (!entry) continue;
      if (lead.status === 'analyzed') entry.analyzed += 1;
      if (lead.status === 'qualified') entry.qualified += 1;
    }
    return result;
  }
}

function inMemoryWebsiteKey(website: string | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    const pathname = url.pathname.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./, '').toLowerCase()}${pathname}`;
  } catch {
    return website
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
  }
}
