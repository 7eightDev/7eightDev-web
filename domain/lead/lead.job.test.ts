import {
  isJobStale,
  resolveJobStatus,
  JOB_STALE_AFTER_MS
} from '@/domain/lead/lead.job';
import type { LeadGenerationJob } from '@/domain/lead/lead.types';

function makeJob(
  overrides: Partial<LeadGenerationJob> &
    Pick<LeadGenerationJob, 'id' | 'status' | 'startedAt'>
): LeadGenerationJob {
  return {
    query: 'Dentisti',
    location: 'Milano',
    totalFound: 0,
    analyzed: 0,
    qualified: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  };
}

const now = new Date('2025-01-01T10:00:00.000Z');

describe('isJobStale', () => {
  it('returns false for terminal jobs, even if old', () => {
    expect(
      isJobStale(
        makeJob({ id: '1', status: 'completed', startedAt: '2025-01-01T00:00:00.000Z' }),
        now
      )
    ).toBe(false);
    expect(
      isJobStale(
        makeJob({ id: '2', status: 'failed', startedAt: '2025-01-01T00:00:00.000Z' }),
        now
      )
    ).toBe(false);
  });

  it('returns false for a fresh running job', () => {
    expect(
      isJobStale(
        makeJob({ id: '3', status: 'running', startedAt: '2025-01-01T09:59:00.000Z' }),
        now
      )
    ).toBe(false);
  });

  it('returns true for a running job older than the threshold', () => {
    expect(
      isJobStale(
        makeJob({ id: '4', status: 'running', startedAt: '2025-01-01T09:00:00.000Z' }),
        now
      )
    ).toBe(true);
  });

  it('treats a pending job without startedAt as stale (dead on arrival)', () => {
    expect(isJobStale(makeJob({ id: '5', status: 'pending', startedAt: undefined }), now)).toBe(true);
  });
});

describe('resolveJobStatus', () => {
  it('returns the job unchanged when not stale', () => {
    const job = makeJob({ id: '1', status: 'running', startedAt: '2025-01-01T09:59:00.000Z' });
    expect(resolveJobStatus(job, now)).toBe(job);
  });

  it('downgrades a stale running job to failed with a default message', () => {
    const job = makeJob({ id: '2', status: 'running', startedAt: '2025-01-01T09:00:00.000Z' });
    const resolved = resolveJobStatus(job, now);
    expect(resolved.status).toBe('failed');
    expect(resolved.error).toContain('timeout');
    expect(resolved.completedAt).toBe(now.toISOString());
  });

  it('keeps terminal jobs terminal', () => {
    const job = makeJob({ id: '3', status: 'completed', startedAt: '2025-01-01T09:00:00.000Z' });
    expect(resolveJobStatus(job, now)).toBe(job);
  });

  it('respects a custom stale threshold (injectable for tests)', () => {
    const job = makeJob({ id: '4', status: 'running', startedAt: '2025-01-01T09:58:30.000Z' });
    // 90 seconds old → stale with a minute threshold, fresh with the default.
    expect(isJobStale(job, now, 60_000)).toBe(true);
    expect(isJobStale(job, now, JOB_STALE_AFTER_MS)).toBe(false);
  });
});
