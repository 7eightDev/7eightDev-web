import { reconcileStaleJobs } from '@/application/lead/reconcile-stale-jobs';
import { InMemoryLeadRepository } from '@/infrastructure/lead/in-memory-lead.repository';
import type { LeadGenerationJob } from '@/domain/lead/lead.types';

const NOW = () => new Date('2026-09-04T20:00:00.000Z');

function makeJob(
  id: string,
  status: LeadGenerationJob['status'],
  startedAtMinutesAgo: number
): LeadGenerationJob {
  const now = NOW();
  return {
    id,
    query: 'dentisti',
    location: 'Milano',
    status,
    totalFound: 10,
    analyzed: 2,
    qualified: 1,
    startedAt: new Date(
      now.getTime() - startedAtMinutesAgo * 60 * 1000
    ).toISOString(),
    createdAt: new Date(
      now.getTime() - startedAtMinutesAgo * 60 * 1000
    ).toISOString()
  };
}

describe('reconcileStaleJobs', () => {
  it('marks a stale running job as failed and returns its count', async () => {
    const repository = new InMemoryLeadRepository();
    await repository.saveJob(makeJob('stale-running', 'running', 30));

    const flagged = await reconcileStaleJobs({ repository, now: NOW });

    expect(flagged).toBe(1);
    const job = await repository.findJobById('stale-running');
    expect(job?.status).toBe('failed');
    expect(job?.error).toContain('Rilancia la ricerca');
    expect(job?.completedAt).toBe('2026-09-04T20:00:00.000Z');
  });

  it('keeps a pending job without a startedAt failed after reconcile', async () => {
    const repository = new InMemoryLeadRepository();
    await repository.saveJob({
      id: 'dead-pending',
      query: 'meccanico',
      location: 'Varese',
      status: 'pending',
      totalFound: 0,
      analyzed: 0,
      qualified: 0,
      createdAt: '2026-09-04T19:00:00.000Z'
    });

    const flagged = await reconcileStaleJobs({ repository, now: NOW });

    expect(flagged).toBe(1);
    expect((await repository.findJobById('dead-pending'))?.status).toBe(
      'failed'
    );
  });

  it('leaves a fresh running job alone', async () => {
    const repository = new InMemoryLeadRepository();
    await repository.saveJob(makeJob('fresh-running', 'running', 2));

    const flagged = await reconcileStaleJobs({ repository, now: NOW });

    expect(flagged).toBe(0);
    expect((await repository.findJobById('fresh-running'))?.status).toBe(
      'running'
    );
  });

  it('leaves completed and failed jobs untouched', async () => {
    const repository = new InMemoryLeadRepository();
    await repository.saveJob(makeJob('done', 'completed', 60));
    await repository.saveJob(
      makeJob('failed', 'failed', 60)
    );

    const flagged = await reconcileStaleJobs({ repository, now: NOW });

    expect(flagged).toBe(0);
    expect((await repository.findJobById('done'))?.status).toBe('completed');
    expect((await repository.findJobById('failed'))?.status).toBe('failed');
  });

  it('preserves existing counters and error when flagging a stale job', async () => {
    const repository = new InMemoryLeadRepository();
    await repository.saveJob({
      ...makeJob('stale-running', 'running', 45),
      totalFound: 20,
      analyzed: 7,
      qualified: 3
    });

    await reconcileStaleJobs({ repository, now: NOW });

    const updated = await repository.findJobById('stale-running');
    expect(updated).toMatchObject({
      status: 'failed',
      totalFound: 20,
      analyzed: 7,
      qualified: 3
    });
  });
});