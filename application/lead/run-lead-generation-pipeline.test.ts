import { runLeadGenerationPipeline } from '@/application/lead/run-lead-generation-pipeline';
import type { AdsDetectionPort, AdsDetectionResult } from '@/domain/lead/lead.ads';
import type { CopyrightPort } from '@/domain/lead/lead.copyright';
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
    async setJobFavorite() {},
    async setLeadFavorite() {},
    async deleteJob() {},
    async findPaginated({ jobId }: { jobId?: string }) {
      const all = [...leads.values()];
      const filtered = jobId
        ? all.filter((lead) => lead.jobId === jobId)
        : all;
      return { leads: filtered, total: filtered.length };
    },
    async findMatchingLeads({ jobId }: { jobId?: string }) {
      const all = [...leads.values()];
      return jobId ? all.filter((lead) => lead.jobId === jobId) : all;
    },
    async countLeadsByJobIds(jobIds) {
      const counts = new Map<string, number>();
      for (const lead of leads.values()) {
        if (lead.jobId && jobIds.includes(lead.jobId)) {
          counts.set(lead.jobId, (counts.get(lead.jobId) ?? 0) + 1);
        }
      }
      return counts;
    },
    async getLeadCountsByJobIds(jobIds) {
      const result = new Map<string, { analyzed: number; qualified: number }>();
      for (const jobId of jobIds) result.set(jobId, { analyzed: 0, qualified: 0 });
      for (const lead of leads.values()) {
        if (!lead.jobId || !jobIds.includes(lead.jobId)) continue;
        const entry = result.get(lead.jobId);
        if (!entry) continue;
        if (lead.status === 'analyzed') entry.analyzed += 1;
        if (lead.status === 'qualified') entry.qualified += 1;
      }
      return result;
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
      return (await repository.findByWebsiteKey(key)) !== null;
    },
    async findByWebsiteKey(key) {
      for (const lead of leads.values()) {
        const k = websiteKeyOf(lead.website);
        if (k === key) return lead;
      }
      return null;
    },
    async existsLeadByCompanyInJob(jobId, companyName, city) {
      for (const lead of leads.values()) {
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
  };

  return repository;
}

function websiteKeyOf(website: string | undefined): string | null {
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

function makeCopyright(value: string | undefined): CopyrightPort {
  return {
    detect: jest.fn().mockResolvedValue(value)
  };
}

function makeAdsResult(
  flags: Partial<AdsDetectionResult> = {}
): AdsDetectionResult {
  return { hasGoogleAds: false, hasMetaPixel: false, hasGtm: false, ...flags };
}

function makeAdsDetection(
  result: AdsDetectionResult
): AdsDetectionPort {
  return {
    detect: jest.fn().mockResolvedValue(result)
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
      analyzed: 0,
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
      outreachStatus: 'not_contacted',
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

  it('re-scores an existing website lead when the same job is re-run', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Acme Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'analyzed',
      outreachStatus: 'not_contacted',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
    };
    const repository = makeRepository([existingLead]);
    const pageSpeed = makePageSpeed({
      performanceScore: 49,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme Studio', website: 'https://acme.example' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: jest.fn(() => 'analysis-same-site'),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(pageSpeed.analyze).toHaveBeenCalledTimes(1);
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].id).toBe('existing-lead');
    expect(result.leads[0].status).toBe('qualified');
    expect(result.job).toMatchObject({
      totalFound: 1,
      analyzed: 0,
      qualified: 1
    });
    expect((await repository.findById('existing-lead'))?.status).toBe(
      'qualified'
    );
  });

  it('does not duplicate a lead without website already captured in this job', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Più Meccanico',
      city: 'Varese',
      source: 'outscraper',
      status: 'new',
      outreachStatus: 'not_contacted',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
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
          { companyName: 'Più Meccanico', city: 'Varese' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: jest.fn(),
        jobId: 'job-1'
      },
      { query: 'meccanico', location: 'Varese', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.leads).toHaveLength(0);
    expect(pageSpeed.analyze).not.toHaveBeenCalled();
    expect(result.job.analyzed).toBe(0);
    // No second copy created for the job.
    expect((await repository.countLeadsByJobIds(['job-1'])).get('job-1')).toBe(
      1
    );
  });

  it('does not touch a website lead that belongs to another job', async () => {
    const otherLead: Lead = {
      id: 'other-lead',
      jobId: 'job-9',
      companyName: 'Altro Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'analyzed',
      outreachStatus: 'not_contacted',
      createdAt: '2026-08-29T10:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z'
    };
    const repository = makeRepository([otherLead]);
    const pageSpeed = makePageSpeed({
      performanceScore: 49,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Altro Studio', website: 'https://acme.example' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: jest.fn(() => 'analysis-never'),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(pageSpeed.analyze).not.toHaveBeenCalled();
    expect(result.leads).toHaveLength(0);
    const stored = await repository.findById('other-lead');
    expect(stored?.jobId).toBe('job-9');
    expect(stored?.status).toBe('analyzed');
  });

  it('persists live progress so analyzed climbs while the job is running', async () => {
    const repository = makeRepository();
    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' },
          { companyName: 'Beta', website: 'https://beta.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 80,
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

    expect(result.ok).toBe(true);
    const runningSnapshots = repository.jobs.filter(
      (job) => job.status === 'running'
    );
    // Start (totalFound 0), discovery (totalFound 2), then a running snapshot
    // with analyzed=1 and analyzed=2 after each analysis, before completion.
    expect(runningSnapshots).toHaveLength(4);
    expect(runningSnapshots.map((job) => job.analyzed)).toEqual([0, 0, 1, 2]);
    expect(runningSnapshots.at(-1)).toMatchObject({
      totalFound: 2,
      analyzed: 2
    });
  });

  it('keeps the previous status when a same-job re-score fails', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Acme Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'qualified',
      outreachStatus: 'not_contacted',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
    };
    const repository = makeRepository([existingLead]);
    const pageSpeed: PageSpeedPort = {
      analyze: jest.fn().mockRejectedValue(new Error('PageSpeed unavailable'))
    };

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme Studio', website: 'https://acme.example' }
        ]),
        pageSpeed,
        repository,
        now: NOW,
        generateId: jest.fn(),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(pageSpeed.analyze).toHaveBeenCalledTimes(1);
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0]).toMatchObject({
      id: 'existing-lead',
      status: 'qualified',
      analysisError: 'PageSpeed unavailable'
    });
    expect(result.job.analyzed).toBe(0);
    expect(result.errors).toEqual([
      {
        companyName: 'Acme Studio',
        website: 'https://acme.example',
        error: 'PageSpeed unavailable'
      }
    ]);
    const stored = await repository.findById('existing-lead');
    expect(stored?.status).toBe('qualified');
    expect(stored?.analysisError).toBe('PageSpeed unavailable');
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
      analyzed: 0,
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
    expect((result.leads[0] as Lead).analysisError).toBe('PageSpeed unavailable');
    expect((result.leads[1] as Lead).analysisError).toBeUndefined();
  });

  it('clears a stale analysisError when a same-job re-score succeeds', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Acme Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'discarded',
      outreachStatus: 'not_contacted',
      analysisError: 'PageSpeed request failed with status 429',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
    };
    const repository = makeRepository([existingLead]);
    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme Studio', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 49,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId: jest.fn(() => 'analysis-1'),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.leads[0]).toMatchObject({
      id: 'existing-lead',
      status: 'qualified',
      analysisError: undefined
    });
    const stored = await repository.findById('existing-lead');
    expect(stored?.status).toBe('qualified');
    expect(stored?.analysisError).toBeUndefined();
  });

  it('recomputes analyzed/qualified at completion from retained leads', async () => {
    const previousRun: Lead = {
      id: 'lead-a',
      jobId: 'job-1',
      companyName: 'Alpha Studio',
      website: 'https://alpha.example',
      source: 'outscraper',
      status: 'qualified',
      outreachStatus: 'not_contacted',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
    };
    const repository = makeRepository([previousRun]);
    // Alpha was analyzed in an earlier run: its analysis row is retained even
    // though this run's discovery no longer returns it.
    await repository.saveAnalysis({
      id: 'prior-analysis-a',
      leadId: 'lead-a',
      strategy: 'mobile',
      performanceScore: 30,
      analyzedAt: '2026-08-30T10:00:00.000Z'
    });

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Beta Studio', website: 'https://beta.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 80,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        repository,
        now: NOW,
        generateId: makeIds(),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 2 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // This run analyzed only Beta, but the completed job must reflect the two
    // leads the search actually holds (Alpha retained qualified + Beta new
    // analyzed), split into the strict status partitions.
    expect(result.job).toMatchObject({
      status: 'completed',
      analyzed: 1,
      qualified: 1
    });
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

  it('detects and persists ads trackers on analyzed leads when the port is wired', async () => {
    const repository = makeRepository();
    const adsDetection = makeAdsDetection(
      makeAdsResult({ hasGoogleAds: true, hasMetaPixel: true })
    );

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 45,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        adsDetection,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(adsDetection.detect).toHaveBeenCalledWith('https://acme.example');
    expect(result.leads[0].hasAds).toBe(true);
    expect(result.leads[0].adsTrackers).toEqual(['Google Ads', 'Meta Pixel']);
    const saved = await repository.findById('lead-1');
    expect(saved?.hasAds).toBe(true);
    expect(saved?.adsTrackers).toEqual(['Google Ads', 'Meta Pixel']);
  });

  it('persists a false ads result as hasAds=false on analyzed leads', async () => {
    const repository = makeRepository();
    const adsDetection = makeAdsDetection(makeAdsResult());

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 45,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        adsDetection,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.leads[0].hasAds).toBe(false);
    expect((await repository.findById('lead-1'))?.hasAds).toBe(false);
  });

  it('detects and persists copyright on analyzed leads when the port is wired', async () => {
    const repository = makeRepository();
    const copyright = makeCopyright('© 2019 Studio Rossi');

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        copyright,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(copyright.detect).toHaveBeenCalledWith('https://acme.example');
    expect(result.leads[0].copyright).toBe('© 2019 Studio Rossi');
    expect((await repository.findById('lead-1'))?.copyright).toBe(
      '© 2019 Studio Rossi'
    );
  });

  it('keeps an already-matched copyright when the site stops exposing one', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Acme Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'analyzed',
      outreachStatus: 'not_contacted',
      copyright: '© 2018 Rotta & Figli',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z'
    };
    const repository = makeRepository([existingLead]);

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme Studio', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 50,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        copyright: makeCopyright(undefined),
        repository,
        now: NOW,
        generateId: jest.fn(),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1, copyright: '© 2018' }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.leads[0].copyright).toBe('© 2018 Rotta & Figli');
    }
  });

  it('clears a payload-like copyright captured by an older detector on re-run', async () => {
    const existingLead: Lead = {
      id: 'existing-lead',
      jobId: 'job-1',
      companyName: 'Acme Studio',
      website: 'https://acme.example',
      source: 'outscraper',
      status: 'analyzed',
      outreachStatus: 'not_contacted',
      copyright: 'self.__next_f.push([1,"footer",'
    } as Lead;
    const repository = makeRepository([existingLead]);

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Acme Studio', website: 'https://acme.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 50,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        copyright: makeCopyright(undefined),
        repository,
        now: NOW,
        generateId: jest.fn(),
        jobId: 'job-1'
      },
      { query: 'dentisti', location: 'Padova', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.leads[0].copyright).toBeUndefined();
    }
  });

  it('keeps leads that do not match the techStack criterion', async () => {
    const repository = makeRepository();
    const techStack = {
      detect: jest
        .fn()
        .mockResolvedValueOnce(['WordPress'])
        .mockResolvedValueOnce(['Wix'])
    };

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Con WP', website: 'https://wp.example' },
          { companyName: 'Con Wix', website: 'https://wix.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        techStack,
        copyright: makeCopyright('© 2019'),
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 2, techStack: 'wordpress' }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The criterion never discards leads: every discovered site is saved and
    // analyzed, the job simply remembers the criterion for the list view.
    expect(result.leads).toHaveLength(2);
    expect(result.leads.map((l) => l.companyName).sort()).toEqual([
      'Con WP',
      'Con Wix'
    ]);
    expect((await repository.findAll()).map((l) => l.companyName).sort()).toEqual([
      'Con WP',
      'Con Wix'
    ]);
    expect((await repository.getLeadCountsByJobIds([result.job.id])).get(result.job.id)).toEqual({
      analyzed: 0,
      qualified: 2
    });
    expect(result.job.techStack).toBe('wordpress');
  });

  it('keeps leads that do not contain the copyright criterion text', async () => {
    const repository = makeRepository();
    const copyright = makeCopyright('© 2024 Pèz Orazio');

    const result = await runLeadGenerationPipeline(
      {
        discovery: makeDiscovery([
          { companyName: 'Vecchio', website: 'https://old.example' }
        ]),
        pageSpeed: makePageSpeed({
          performanceScore: 30,
          lcp: null,
          fcp: null,
          cls: null,
          tbt: null
        }),
        copyright,
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'dentisti', location: 'Padova', quantity: 1, copyright: '© 2019' }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].copyright).toBe('© 2024 Pèz Orazio');
    expect(await repository.findAll()).toHaveLength(1);
    expect(result.job.copyright).toBe('© 2019');
  });

  it('saves leads without a website even when criteria narrow the search', async () => {
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
          { companyName: 'Nessun Sito', category: 'Garage' },
          { companyName: 'Con Sito', website: 'https://with.example' }
        ]),
        pageSpeed,
        techStack: {
          detect: jest.fn().mockResolvedValue(['WordPress'])
        },
        copyright: makeCopyright('© 2020'),
        repository,
        now: NOW,
        generateId: makeIds()
      },
      { query: 'meccanico', location: 'Varese', quantity: 2, techStack: 'wordpress' }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.leads.map((l) => l.companyName)).toEqual([
      'Nessun Sito',
      'Con Sito'
    ]);
    expect((await repository.findAll()).map((l) => l.companyName)).toEqual([
      'Nessun Sito',
      'Con Sito'
    ]);
  });
});
