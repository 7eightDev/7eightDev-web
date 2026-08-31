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

export interface RunLeadGenerationPipelineDeps {
  readonly discovery: LeadDiscoveryPort;
  readonly pageSpeed: PageSpeedPort;
  readonly repository: LeadRepository;
  readonly now?: () => Date;
  readonly generateId?: () => string;
  readonly source?: LeadSource;
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
    id: generateId(),
    query: input.query,
    location: input.location,
    status: 'running',
    totalFound: 0,
    analyzed: 0,
    qualified: 0,
    startedAt: createdAt,
    createdAt
  };

  await deps.repository.saveJob(job);

  let discoveredLeads: DiscoveredLead[];
  try {
    discoveredLeads = await deps.discovery.search(input);
  } catch (error) {
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

  const existingWebsiteKeys = new Set(
    (await deps.repository.findAll())
      .map((lead) => websiteKey(lead.website))
      .filter((key): key is string => key !== null)
  );
  const batchWebsiteKeys = new Set<string>();
  const persistedLeads: Lead[] = [];
  const errors: LeadPipelineError[] = [];

  for (const discoveredLead of discoveredLeads) {
    const key = websiteKey(discoveredLead.website);
    if (key && (existingWebsiteKeys.has(key) || batchWebsiteKeys.has(key))) {
      continue;
    }
    if (key) batchWebsiteKeys.add(key);

    const lead = buildLead({
      discoveredLead,
      generateId,
      now,
      source,
      status: discoveredLead.website ? 'new' : 'discarded'
    });

    await deps.repository.save(lead);

    if (!discoveredLead.website) {
      persistedLeads.push(lead);
      continue;
    }

    try {
      const pageSpeedResult = await deps.pageSpeed.analyze({
        url: discoveredLead.website,
        strategy: 'mobile'
      });
      const analysis = buildAnalysis({
        generateId,
        leadId: lead.id,
        now,
        pageSpeedResult
      });
      const status = leadStatusFromPageSpeed(pageSpeedResult);
      const analyzedLead = {
        ...lead,
        status,
        updatedAt: now().toISOString()
      };

      await deps.repository.saveAnalysis(analysis);
      await deps.repository.save(analyzedLead);

      job = {
        ...job,
        analyzed: job.analyzed + 1,
        qualified: status === 'qualified' ? job.qualified + 1 : job.qualified
      };
      await deps.repository.saveJob(job);
      persistedLeads.push(analyzedLead);
    } catch (error) {
      const discardedLead = {
        ...lead,
        status: 'discarded' as const,
        updatedAt: now().toISOString()
      };
      await deps.repository.save(discardedLead);
      errors.push({
        companyName: discoveredLead.companyName,
        website: discoveredLead.website,
        error: errorMessage(error)
      });
      persistedLeads.push(discardedLead);
    }
  }

  job = {
    ...job,
    status: 'completed',
    completedAt: now().toISOString()
  };
  await deps.repository.saveJob(job);

  return { ok: true, job, leads: persistedLeads, errors };
}

function buildLead(input: {
  discoveredLead: DiscoveredLead;
  generateId: () => string;
  now: () => Date;
  source: LeadSource;
  status: LeadStatus;
}): Lead {
  const timestamp = input.now().toISOString();

  return {
    id: input.generateId(),
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
