import type {
  DiscoveredLead,
  LeadDiscoveryPort,
  LeadSearchInput
} from '@/domain/lead/lead.discovery';
import type {
  PageSpeedPort,
  PageSpeedResult
} from '@/domain/lead/lead.pagespeed';
import type { LeadRepository } from '@/domain/lead/lead.repository';
import { calculateLeadQualification } from '@/domain/lead/lead.score';
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob,
  LeadSource,
  LeadStatus
} from '@/domain/lead/lead.types';
import { createLogger } from '@/infrastructure/logging/logger';

const log = createLogger('pipeline');

export interface RunLeadGenerationPipelineDeps {
  readonly discovery: LeadDiscoveryPort;
  readonly pageSpeed: PageSpeedPort;
  readonly repository: LeadRepository;
  readonly now?: () => Date;
  readonly generateId?: () => string;
  readonly source?: LeadSource;
  readonly jobId?: string;
}

export type RunLeadGenerationPipelineResult =
  | {
      readonly ok: true;
      readonly job: LeadGenerationJob;
      readonly leads: Lead[];
      readonly errors: LeadPipelineError[];
    }
  | {
      readonly ok: false;
      readonly job: LeadGenerationJob;
      readonly error: string;
    };

export interface LeadPipelineError {
  readonly companyName: string;
  readonly website?: string;
  readonly error: string;
}

export async function runLeadGenerationPipeline(
  deps: RunLeadGenerationPipelineDeps,
  input: LeadSearchInput
): Promise<RunLeadGenerationPipelineResult> {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => crypto.randomUUID());
  const source = deps.source ?? 'outscraper';

  const createdAt = now().toISOString();
  let job: LeadGenerationJob = {
    id: deps.jobId ?? generateId(),
    query: input.query,
    location: input.location,
    quantity: input.quantity,
    status: 'running',
    totalFound: 0,
    analyzed: 0,
    qualified: 0,
    startedAt: createdAt,
    createdAt
  };

  await deps.repository.saveJob(job);

  log.info('Job started', { jobId: job.id, query: input.query, location: input.location });

  let discoveredLeads: DiscoveredLead[];
  try {
    discoveredLeads = await deps.discovery.search(input);
  } catch (error) {
    log.error('Discovery failed', { jobId: job.id, error: errorMessage(error) });
    job = {
      ...job,
      status: 'failed',
      completedAt: now().toISOString(),
      error: errorMessage(error)
    };
    await deps.repository.saveJob(job);
    return { ok: false, job, error: job.error ?? 'Lead discovery failed' };
  }

  job = {
    ...job,
    totalFound: discoveredLeads.length
  };
  await deps.repository.saveJob(job);

  log.info('Discovery complete', { jobId: job.id, totalFound: discoveredLeads.length });

  const batchWebsiteKeys = new Set<string>();
  const persistedLeads: Lead[] = [];
  const errors: LeadPipelineError[] = [];

  for (const discoveredLead of discoveredLeads) {
    const key = websiteKey(discoveredLead.website);
    if (key && batchWebsiteKeys.has(key)) {
      continue;
    }
    if (key) batchWebsiteKeys.add(key);

    if (key) {
      const existing = await deps.repository.findByWebsiteKey(key);
      if (existing) {
        if (existing.jobId !== job.id) {
          log.debug('Lead exists under another job, skipped', {
            jobId: job.id,
            company: discoveredLead.companyName
          });
          continue;
        }
        // A re-run of THIS job re-scores its own websites instead of silently
        // skipping them, keeping the counter coherent with a fresh research.
        const refreshed = await analyzeLead({
          deps,
          job,
          lead: refreshLeadData(existing, discoveredLead),
          discoveredLead,
          generateId,
          now
        });
        job = refreshed.job;
        if (refreshed.error) {
          errors.push({
            companyName: discoveredLead.companyName,
            website: discoveredLead.website,
            error: refreshed.error
          });
        }
        persistedLeads.push(refreshed.lead);
        continue;
      }
    } else if (
      await deps.repository.existsLeadByCompanyInJob(
        job.id,
        discoveredLead.companyName,
        discoveredLead.city
      )
    ) {
      // Lead without a website is deduplicated against THIS job only: a fresh
      // research must not create another copy of the same business.
      log.debug('Lead without website already captured, skipped', {
        jobId: job.id,
        company: discoveredLead.companyName
      });
      continue;
    }

    // Leads always start as 'new': those without a website stay visible so the
    // admin can contact them (e.g. by phone) instead of silently discarding them.
    const lead = buildLead({
      discoveredLead,
      generateId,
      now,
      source,
      jobId: job.id,
      status: 'new'
    });

    await deps.repository.save(lead);

    if (!discoveredLead.website) {
      persistedLeads.push(lead);
      continue;
    }

    const refreshed = await analyzeLead({
      deps,
      job,
      lead,
      discoveredLead,
      generateId,
      now
    });
    job = refreshed.job;
    if (refreshed.error) {
      errors.push({
        companyName: discoveredLead.companyName,
        website: discoveredLead.website,
        error: refreshed.error
      });
    }
    persistedLeads.push(refreshed.lead);
  }

  job = {
    ...job,
    status: 'completed',
    completedAt: now().toISOString()
  };
  await deps.repository.saveJob(job);

  log.info('Job completed', {
    jobId: job.id,
    analyzed: job.analyzed,
    qualified: job.qualified,
    errors: errors.length
  });

  return { ok: true, job, leads: persistedLeads, errors };
}

function buildLead(input: {
  discoveredLead: DiscoveredLead;
  generateId: () => string;
  now: () => Date;
  source: LeadSource;
  jobId: string;
  status: LeadStatus;
}): Lead {
  const timestamp = input.now().toISOString();

  return {
    id: input.generateId(),
    jobId: input.jobId,
    companyName: input.discoveredLead.companyName,
    category: input.discoveredLead.category,
    website: input.discoveredLead.website,
    phone: input.discoveredLead.phone,
    email: input.discoveredLead.email,
    address: input.discoveredLead.address,
    city: input.discoveredLead.city,
    source: input.source,
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function buildAnalysis(input: {
  generateId: () => string;
  leadId: string;
  now: () => Date;
  pageSpeedResult: PageSpeedResult;
}): LeadAnalysis {
  return {
    id: input.generateId(),
    leadId: input.leadId,
    strategy: 'mobile',
    performanceScore: input.pageSpeedResult.performanceScore ?? undefined,
    lcp: input.pageSpeedResult.lcp ?? undefined,
    fcp: input.pageSpeedResult.fcp ?? undefined,
    cls: input.pageSpeedResult.cls ?? undefined,
    tbt: input.pageSpeedResult.tbt ?? undefined,
    analyzedAt: input.now().toISOString()
  };
}

/** Re-scores a lead that already belongs to this job without creating a copy. */
async function analyzeLead(input: {
  deps: RunLeadGenerationPipelineDeps;
  job: LeadGenerationJob;
  lead: Lead;
  discoveredLead: DiscoveredLead;
  generateId: () => string;
  now: () => Date;
}): Promise<{ job: LeadGenerationJob; lead: Lead; error?: string }> {
  try {
    const pageSpeedResult = await input.deps.pageSpeed.analyze({
      url: input.lead.website!,
      strategy: 'mobile'
    });
    const analysis = buildAnalysis({
      generateId: input.generateId,
      leadId: input.lead.id,
      now: input.now,
      pageSpeedResult
    });
    const status = leadStatusFromPageSpeed(pageSpeedResult);
    const analyzedLead = {
      ...input.lead,
      status,
      updatedAt: input.now().toISOString()
    };

    await input.deps.repository.saveAnalysis(analysis);
    await input.deps.repository.save(analyzedLead);

    log.debug('Lead analyzed', {
      jobId: input.job.id,
      company: input.discoveredLead.companyName,
      score: pageSpeedResult.performanceScore,
      status
    });

    return {
      job: {
        ...input.job,
        analyzed: input.job.analyzed + 1,
        qualified: status === 'qualified' ? input.job.qualified + 1 : input.job.qualified
      },
      lead: analyzedLead
    };
  } catch (error) {
    log.warn('Lead analysis failed', {
      jobId: input.job.id,
      company: input.discoveredLead.companyName,
      website: input.lead.website,
      error: errorMessage(error)
    });
    const discardedLead = {
      ...input.lead,
      status: 'discarded' as const,
      analysisError: errorMessage(error),
      updatedAt: input.now().toISOString()
    };
    await input.deps.repository.save(discardedLead);
    return { job: input.job, lead: discardedLead, error: errorMessage(error) };
  }
}

/** Refreshes mutable data from the latest research, keeping past captures. */
function refreshLeadData(existing: Lead, discoveredLead: DiscoveredLead): Lead {
  return {
    ...existing,
    companyName: discoveredLead.companyName ?? existing.companyName,
    category: discoveredLead.category ?? existing.category,
    website:
      discoveredLead.website ?? existing.website,
    phone: discoveredLead.phone ?? existing.phone,
    email: discoveredLead.email ?? existing.email,
    address: discoveredLead.address ?? existing.address,
    city: discoveredLead.city ?? existing.city
  };
}

function leadStatusFromPageSpeed(result: PageSpeedResult): LeadStatus {
  const qualification = calculateLeadQualification(
    result.performanceScore ?? undefined
  );

  return qualification === 'qualified' ? 'qualified' : 'analyzed';
}

function websiteKey(website: string | undefined) {
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown lead pipeline error';
}
