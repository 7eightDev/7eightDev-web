import type {
  LeadDiscoveryPort,
  LeadSearchInput
} from '@/domain/lead/lead.discovery';
import type { PageSpeedPort } from '@/domain/lead/lead.pagespeed';
import type { LeadRepository } from '@/domain/lead/lead.repository';
import type {
  LeadGenerationJob,
  LeadSource
} from '@/domain/lead/lead.types';
import { runLeadGenerationPipeline } from '@/application/lead/run-lead-generation-pipeline';
import { createLogger } from '@/infrastructure/logging/logger';

const log = createLogger('startRunLeadJob');

export interface StartRunLeadJobDeps {
  readonly discovery: LeadDiscoveryPort;
  readonly pageSpeed: PageSpeedPort;
  readonly repository: LeadRepository;
  readonly source?: LeadSource;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

export interface StartRunLeadJobResult {
  readonly ok: true;
  readonly jobId: string;
}

/**
 * Creates a lead-generation job and kicks off its pipeline WITHOUT awaiting
 * completion, so the calling request returns immediately. The job is persisted
 * as 'running' first; the pipeline (runLeadGenerationPipeline) drives it to
 * 'completed' or 'failed' in the background while the UI polls its status.
 */
export async function startRunLeadJob(
  deps: StartRunLeadJobDeps,
  input: LeadSearchInput
): Promise<StartRunLeadJobResult> {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => crypto.randomUUID());

  const createdAt = now().toISOString();
  const job: LeadGenerationJob = {
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

  // Persist before launch so a non-terminal state is visible immediately.
  await deps.repository.saveJob(job);

  // Fire-and-forget: the pipeline updates progress + final status in the
  // background. Deliberately not awaited.
  void runLeadGenerationPipeline(
    {
      discovery: deps.discovery,
      pageSpeed: deps.pageSpeed,
      repository: deps.repository,
      now,
      generateId,
      source: deps.source
    },
    input
  ).catch((error) => {
    // Log the residual error for tracking; the pipeline already handles
    // per-lead errors and job failure internally, but a top-level catch
    // prevents any unhandled rejection from crashing the process.
    log.error('Unhandled pipeline error', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  return { ok: true, jobId: job.id };
}
