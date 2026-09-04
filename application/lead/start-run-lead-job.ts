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
 * Reuses an existing job id when re-running a search, so the sidebar shows a
 * single card per search instead of accumulating duplicates.
 */
export interface StartRunLeadJobOptions {
  readonly jobId?: string;
}

/**
 * Creates a lead-generation job and kicks off its pipeline WITHOUT awaiting
 * completion, so the calling request returns immediately. The job is persisted
 * as 'running' first; the pipeline (runLeadGenerationPipeline) drives it to
 * 'completed' or 'failed' in the background while the UI polls its status.
 */
export async function startRunLeadJob(
  deps: StartRunLeadJobDeps,
  input: LeadSearchInput,
  options: StartRunLeadJobOptions = {}
): Promise<StartRunLeadJobResult> {
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => crypto.randomUUID());

  const createdAt = now().toISOString();
  const job: LeadGenerationJob = {
    id: options.jobId ?? generateId(),
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
      source: deps.source,
      jobId: job.id
    },
    input
  ).catch(async (error) => {
    // The pipeline already handles per-lead errors and job failure
    // internally, but anything escaping it (e.g. a repository write failure)
    // would otherwise leave the job stuck 'running' forever. Persist the
    // failure so the card does not poll an eternally non-terminal job.
    const message = error instanceof Error ? error.message : String(error);
    log.error('Unhandled pipeline error', { jobId: job.id, error: message });

    try {
      const current = (await deps.repository.findJobById(job.id)) ?? job;
      await deps.repository.saveJob({
        ...current,
        status: 'failed',
        error: `Pipeline interrotta: ${message}`,
        completedAt: current.completedAt ?? now().toISOString()
      });
    } catch (saveError) {
      log.error('Unable to persist job failure', {
        jobId: job.id,
        error: saveError instanceof Error ? saveError.message : String(saveError)
      });
    }
  });

  return { ok: true, jobId: job.id };
}
