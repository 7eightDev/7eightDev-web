import { runLeadGenerationPipeline } from '@/application/lead/run-lead-generation-pipeline';
import type { LeadDiscoveryPort } from '@/domain/lead/lead.discovery';
import type { PageSpeedPort, PageSpeedResult } from '@/domain/lead/lead.pagespeed';
import type { LeadRepository } from '@/domain/lead/lead.repository';
import type { Lead, LeadAnalysis, LeadGenerationJob } from '@/domain/lead/lead.types';

const NOW = () => new Date('2026-08-31T10:00:00.000Z');

function makeIds() {
  const ids = ['job-1', 'lead-1', 'analysis-1', 'lead-2', 'analysis-2'];
  return () => ids.shift() ?? 'extra-id';
}

function makeRepository(existingLeads: Lead[] = []) {
  const leads = new Map(existingLeads.map((lead) => [lead.id, lead]));
  const analyses = new Map<string, LeadAnalysis>();
  const jobs: LeadGenerationJob[] = [];

  const repository: LeadRepository & {
    analyses: Map<string, LeadAnalysis>;
    jobs: LeadGenerationJob[];
  } = {
    analyses,
    jobs,
    async findById(id) {
      return leads.get(id) ?? null;
    },
    async findAll() {
      return [...leads.values()];
    },
    async save(lead) {
      leads.set(lead.id, lead);
    },
    async delete(id) {
      leads.delete(id);
    },
    async findAnalysesByLeadId(leadId) {
      return [...analyses.values()].filter(
        (analysis) => analysis.leadId === leadId
      );
    },
    async saveAnalysis(analysis) {
      analyses.set(analysis.id, analysis);
    },
    async findJobById(id) {
      return jobs.find((job) => job.id === id) ?? null;
    },
    async findAllJobs() {
      return [...jobs];
    },
    async saveJob(job) {
      jobs.push(job);
    },
    async findPaginated({ jobId }: { jobId?: string }) {
      const all = [...leads.values()];
      const filtered = jobId
        ? all.filter((lead) => lead.jobId === jobId)
        : all;
      return { leads: filtered, total: filtered.length };
    },
    async findLatestAnalysesByLeadIds(leadIds) {
      const idSet = new Set(leadIds);
      const byLead = new Map<string, LeadAnalysis>();
      for (const a of analyses.values()) {
        if (!idSet.has(a.leadId)) continue;
        const existing = byLead.get(a.leadId);
        if (!existing || a.analyzedAt > existing.analyzedAt) {
          byLead.set(a.leadId, a);
        }
      }
      return [...byLead.values()];
    },
    async existsByWebsiteKey(key) {
      for (const lead of leads.values()) {
        if (lead.website) {
          try {
            const url = new URL(lead.website);
            const k = `${url.hostname.replace(/^www\./, '').toLowerCase()}${url.pathname.replace(/\/$/, '')}`;
            if (k === key) return true;
          } catch {
            const k = lead.website.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
            if (k === key) return true;
          }
        }
      }
      return false;
    }
  };

  return repository;
}

function makeDiscovery(
  leads: Awaited<ReturnType<LeadDiscoveryPort['search']>>
): LeadDiscoveryPort {
  return {
    search: jest.fn().mockResolvedValue(leads)
  };
}

function makePageSpeed(result: PageSpeedResult): PageSpeedPort {
  return {
    analyze: jest.fn().mockResolvedValue(result)
  };
}

describe('runLeadGenerationPipeline', () => {
  it('discovers, persists, analyzes and qualifies leads', async () => {
    const repository = makeRepository();
    const discovery = makeDiscovery([
      {
        companyName: 'Studio Dentistico Acme',
        category: 'Dentist',
        website: 'https://acme.example',
        city: 'Padova'
      }
    ]);
    const pageSpeed = makePageSpeed({
      performanceScore: 49,
      lcp: 2500,
      fcp: 1200,
      cls: 0.12,
      tbt: 300
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery,
        pageSpeed,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      {
        query: 'dentisti',
        location: 'Padova',
        quantity: 10
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(discovery.search).toHaveBeenCalledWith({
      query: 'dentisti',
      location: 'Padova',
      quantity: 10
    });
    expect(pageSpeed.analyze).toHaveBeenCalledWith({
      url: 'https://acme.example',
      strategy: 'mobile'
    });
    expect(result.job).toMatchObject({
      status: 'completed',
      totalFound: 1,
      analyzed: 1,
      qualified: 1
    });
    expect(result.leads[0]).toMatchObject({
      companyName: 'Studio Dentistico Acme',
      status: 'qualified',
      source: 'outscraper'
    });
    expect([...repository.analyses.values()][0]).toMatchObject({
      leadId: 'lead-1',
      strategy: 'mobile',
      performanceScore: 49,
      lcp: 2500,
      fcp: 1200,
      cls: 0.12,
      tbt: 300
    });
  });

  it('marks analyzed leads as not qualified when performance is at least 50', async () => {
    const repository = makeRepository();
    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          {
            companyName: 'Acme',
            website: 'https://acme.example'
          }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 50,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.leads[0].status).toBe('analyzed');
      expect(result.job.qualified).toBe(0);
    }
  });

  it('keeps leads without a website as new (not discarded) and skips analysis', async () => {
    const repository = makeRepository();
    const pageSpeed = makePageSpeed({
      performanceScore: 80,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Più Meccanico', category: 'Garage' },
          { companyName: 'Con Sito', website: 'https://with.example' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'meccanico', location: 'Varese', quantity: 2 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const noSite = result.leads.find((l) => l.companyName === 'Più Meccanico');
    expect(noSite?.status).toBe('new');
    expect(noSite?.source).toBe('outscraper');
    // No PageSpeed call for the lead without a website.
    expect(pageSpeed.analyze).toHaveBeenCalledTimes(1);
  });

  it('deduplicates by website against existing leads and current batch', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      companyName: 'Existing',
      website: 'https://existing.example',
      source: 'outscraper',
      status: 'new',
      createdAt: NOW().toISOString(),
      updatedAt: NOW().toISOString()
    };
    const repository = makeRepository([existingLead]);
    const pageSpeed = makePageSpeed({
      performanceScore: 80,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          {
            companyName: 'Duplicate Existing',
            website: 'https://www.existing.example/'
          },
          {
            companyName: 'New Lead',
            website: 'https://new.example'
          },
          {
            companyName: 'Duplicate Batch',
            website: 'https://www.new.example/'
          }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 3 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.job.totalFound).toBe(3);
      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].companyName).toBe('New Lead');
    }
    expect(pageSpeed.analyze).toHaveBeenCalledTimes(1);
  });

  it('continues the pipeline when a single PageSpeed analysis fails', async () => {
    const repository = makeRepository();
    const pageSpeed: PageSpeedPort = {
      analyze: jest
        .fn()
        .mockRejectedValueOnce(new Error('PageSpeed unavailable'))
        .mockResolvedValueOnce({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        })
    };

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Broken', website: 'https://broken.example' },
          { companyName: 'Good', website: 'https://good.example' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 2 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      status: 'completed',
      totalFound: 2,
      analyzed: 1,
      qualified: 1
    });
    expect(result.errors).toEqual([
      {
        companyName: 'Broken',
        website: 'https://broken.example',
        error: 'PageSpeed unavailable'
      }
    ]);
    expect(result.leads.map((lead) => lead.status)).toEqual([
      'discarded',
      'qualified'
    ]);
  });

  it('fails the job when discovery fails', async () => {
    const repository = makeRepository();
    const discovery: LeadDiscoveryPort = {
      search: jest.fn().mockRejectedValue(new Error('Discovery unavailable'))
    };

    const result = await runLeadGenerationPipeline(
      {
        discovery,
        pageSpeed: makePageSpeed({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 2 }
    );

    expect(result).toMatchObject({
      ok: false,
      error: 'Discovery unavailable',
      job: {
        status: 'failed',
        error: 'Discovery unavailable'
      }
    });
    expect(repository.jobs).toHaveLength(2);
  });

  it('reuses a provided jobId instead of generating a new job', async () => {
    const repository = makeRepository();
    let seq = 0;
    const generateId = jest.fn(() => `generated-${++seq}`);

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 20,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId,
        jobId: 'job-42'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.job.id).toBe('job-42');
    expect(repository.jobs.every((job) => job.id === 'job-42')).toBe(true);
    expect(generateId).toHaveBeenCalled();
    expect(result.leads[0]).toMatchObject({
      jobId: 'job-42'
    });
    expect(
      await repository.findPaginated({ page: 1, pageSize: 50, jobId: 'job-42' })
    ).toEqual({ leads: result.leads, total: result.leads.length });
  });

  it('associates every persisted lead with the job id', async () => {
    const repository = makeRepository();
    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' },
          { companyName: 'Beta', website: 'https://beta.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId: makeIds(),
        jobId: 'job-7'
      },
      { query: 'dentisti', location: 'Padova', quantity: 2 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.leads).toHaveLength(2);
      expect(result.leads.every((lead) => lead.jobId === 'job-7')).toBe(true);
    }
  });
});
