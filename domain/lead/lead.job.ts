import type { LeadGenerationJob } from '@/domain/lead/lead.types';

/**
 * After how many milliseconds a job stuck in a non-terminal state
 * ('pending' / 'running') is considered stale — i.e. the executing process
 * was killed (serverless timeout, crash) and the job will never complete on
 * its own.
 */
export const JOB_STALE_AFTER_MS = 20 * 60 * 1000; // 20 min

const TERMINAL: LeadGenerationJob['status'][] = ['completed', 'failed'];

/**
 * True when job.startedAt is absent or older than `staleAfterMs`.
 * Used to distinguish an in-flight job we should still poll from one whose
 * worker died and will never progress.
 */
export function isJobStale(
  job: LeadGenerationJob,
  now: Date = new Date(),
  staleAfterMs: number = JOB_STALE_AFTER_MS
): boolean {
  if (TERMINAL.includes(job.status)) return false;
  const started = job.startedAt ? new Date(job.startedAt).getTime() : 0;
  return now.getTime() - started > staleAfterMs;
}

/**
 * Classify a job for the polling UI: terminal jobs are returned as-is;
 * non-terminal jobs that are stale are downgraded to 'failed' (with an
 * explanatory error) so they stop polling and surface to the admin instead of
 * hanging forever.
 */
export function resolveJobStatus(
  job: LeadGenerationJob,
  now: Date = new Date(),
  staleAfterMs: number = JOB_STALE_AFTER_MS
): LeadGenerationJob {
  if (!isJobStale(job, now, staleAfterMs)) return job;
  return {
    ...job,
    status: 'failed',
    error: job.error ?? 'Job interrotto: timeout di esecuzione superato.',
    completedAt: job.completedAt ?? now.toISOString()
  };
}
