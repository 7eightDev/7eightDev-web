import type {
  StartRunLeadJobDeps,
  StartRunLeadJobResult
} from '@/application/lead/start-run-lead-job';
import { startRunLeadJob } from '@/application/lead/start-run-lead-job';

export type RerunLeadGenerationJobResult =
  | StartRunLeadJobResult
  | { readonly ok: false; readonly error: string };

/**
 * Re-runs an existing search reusing the SAME job id, so the admin sidebar
 * keeps a single card per search instead of accumulating duplicates. Refuses
 * to restart a job that is still pending/running.
 */
export async function rerunLeadGenerationJob(
  deps: StartRunLeadJobDeps,
  jobId: string
): Promise<RerunLeadGenerationJobResult> {
  const job = await deps.repository.findJobById(jobId);
  if (!job) {
    return { ok: false, error: 'Job non trovato.' };
  }
  if (job.status === 'running' || job.status === 'pending') {
    return { ok: false, error: 'Questa ricerca è già in corso.' };
  }

  return startRunLeadJob(
    deps,
    {
      query: job.query,
      location: job.location,
      quantity: job.quantity ?? undefined
    },
    { jobId: job.id }
  );
}