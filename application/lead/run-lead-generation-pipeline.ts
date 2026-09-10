import type {
  DiscoveredLead,
  LeadDiscoveryPort,
  LeadSearchInput
} from '@/domain/lead/lead.discovery';
import type {
  PageSpeedPort,
  PageSpeedResult
} from '@/domain/lead/lead.pagespeed';
import type { CopyrightPort } from '@/domain/lead/lead.copyright';
import { isCopyrightPayload } from '@/domain/lead/lead.copyright';
import type { LeadRepository } from '@/domain/lead/lead.repository';
import type { TechStackPort } from '@/domain/lead/lead.tech';
import type { AdsDetectionPort } from '@/domain/lead/lead.ads';
import { adsResultToTrackers } from '@/domain/lead/lead.ads';
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
  readonly techStack?: TechStackPort;
  readonly copyright?: CopyrightPort;
  readonly adsDetection?: AdsDetectionPort;
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
    techStack: input.techStack,
    copyright: input.copyright,
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
        // Persist counters after every analysis so the card shows live
        // progress instead of staying at "analyzed 0" for the whole run.
        await deps.repository.saveJob(job);
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

    if (!discoveredLead.website) {
      await deps.repository.save(lead);
      persistedLeads.push(lead);
      continue;
    }

    await deps.repository.save(lead);

    const refreshed = await analyzeLead({
      deps,
      job,
      lead,
      discoveredLead,
      generateId,
      now
    });
    job = refreshed.job;
    await deps.repository.saveJob(job);
    if (refreshed.error) {
      errors.push({
        companyName: discoveredLead.companyName,
        website: discoveredLead.website,
        error: refreshed.error
      });
    }
    persistedLeads.push(refreshed.lead);
  }

  // The run-time counters only reflect this run's discoveries. Recompute from
  // the persisted leads so a re-score that kept prior analyses (or loaded old
  // runs) reports the real analyzed/qualified totals for the job.
  const counts = await deps.repository.getLeadCountsByJobIds([job.id]);
  job = {
    ...job,
    analyzed: counts.get(job.id)?.analyzed ?? job.analyzed,
    qualified: counts.get(job.id)?.qualified ?? job.qualified,
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
    outreachStatus: 'not_contacted',
    favorite: false,
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
    const techStack =
      input.deps.techStack && input.lead.website
        ? await input.deps.techStack.detect(input.lead.website)
        : [];
    const copyright =
      input.deps.copyright && input.lead.website
        ? await input.deps.copyright.detect(input.lead.website)
        : undefined;
    const adsTrackers =
      input.deps.adsDetection && input.lead.website
        ? await detectAds(input.deps.adsDetection, input.lead.website)
        : undefined;
    const analyzedLead = {
      ...input.lead,
      status,
      techStack: techStack.length > 0 ? techStack : input.lead.techStack,
      // Keep a previously captured copyright when the site no longer exposes
      // one (e.g. moved the text to an image): the criterion already matched.
      // Payload values from older detectors are never retained on re-run.
      copyright:
        copyright ??
        (isCopyrightPayload(input.lead.copyright)
          ? undefined
          : input.lead.copyright),
      // Ad tracking is an additive signal: a "clean" re-detect resets the
      // flags, but when detection is skipped entirely the previous capture
      // stays (same trade-off as techStack/copyright re-runs).
      hasAds: adsTrackers
        ? adsTrackers.length > 0
        : input.lead.hasAds,
      adsTrackers:
        adsTrackers && adsTrackers.length > 0
          ? adsTrackers
          : input.lead.adsTrackers,
      // A successful re-analysis supersedes any earlier failure, so the
      // stale `analysisError` from a previous run must not persist.
      analysisError: undefined,
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
        // Each status is a separate partition: a lead counts as `analyzed`
        // only if it did NOT qualify, and as `qualified` only if it did.
        analyzed:
          status === 'qualified'
            ? input.job.analyzed
            : input.job.analyzed + 1,
        qualified:
          status === 'qualified'
            ? input.job.qualified + 1
            : input.job.qualified
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
    const keptStatus: LeadStatus =
      input.lead.status === 'new' ? 'discarded' : input.lead.status;
    const failedLead = {
      ...input.lead,
      status: keptStatus,
      analysisError: errorMessage(error),
      updatedAt: input.now().toISOString()
    };
    await input.deps.repository.save(failedLead);
    return { job: input.job, lead: failedLead, error: errorMessage(error) };
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

async function detectAds(
  detector: AdsDetectionPort,
  website: string
): Promise<string[] | undefined> {
  try {
    const result = await detector.detect(website);
    return adsResultToTrackers(result);
  } catch {
    // Best-effort by design: a detection failure must never fail the lead.
    return undefined;
  }
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
