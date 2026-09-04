import type { LeadRepository } from '@/domain/lead/lead.repository';
import { isJobStale, JOB_STALE_AFTER_MS } from '@/domain/lead/lead.job';
import { createLogger } from '@/infrastructure/logging/logger';

const log = createLogger('reconcileStaleJobs');

export interface ReconcileStaleJobsDeps {
  readonly repository: LeadRepository;
  readonly now?: () => Date;
}

/**
 * Persists 'failed' for non-terminal jobs whose worker died (crash, server
 * restart, unhandled pipeline error): the view already downgrades them after
 * `JOB_STALE_AFTER_MS`, but the DB row stays 'running' forever. Running this
 * on the admin page makes that recovery durable and idempotent.
 *
 * @returns number of jobs flushed to 'failed'.
 */
export async function reconcileStaleJobs(
  deps: ReconcileStaleJobsDeps
): Promise<number> {
  const now = deps.now ?? (() => new Date());
  const jobs = await deps.repository.findAllJobs();
  let flagged = 0;

  for (const job of jobs) {
    const stale = isJobStale(job, now(), JOB_STALE_AFTER_MS);
    if (!stale) continue;

    await deps.repository.saveJob({
      ...job,
      status: 'failed',
      error:
        job.error ??
        'Job interrotto: il processo si è fermato. Rilancia la ricerca per riprovare.',
      completedAt: job.completedAt ?? now().toISOString()
    });
    flagged += 1;
    log.warn('Stale job flagged as failed', { jobId: job.id });
  }

  return flagged;
}