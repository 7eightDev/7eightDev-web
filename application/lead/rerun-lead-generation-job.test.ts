import { rerunLeadGenerationJob } from '@/application/lead/rerun-lead-generation-job';
import { startRunLeadJob } from '@/application/lead/start-run-lead-job';
import { InMemoryLeadRepository } from '@/infrastructure/lead/in-memory-lead.repository';
import type { LeadGenerationJob } from '@/domain/lead/lead.types';

jest.mock('@/application/lead/start-run-lead-job', () => ({
  startRunLeadJob: jest.fn()
}));

const mockedStartRunLeadJob = jest.mocked(startRunLeadJob);

function makeJob(overrides: Partial<LeadGenerationJob> = {}): LeadGenerationJob {
  return {
    id: 'job-1',
    query: 'autorimessa',
    location: 'napoli',
    quantity: 20,
    status: 'completed',
    totalFound: 20,
    analyzed: 20,
    qualified: 0,
    completedAt: '2026-09-04T10:00:00.000Z',
    error: undefined,
    createdAt: '2026-09-04T09:00:00.000Z',
    ...overrides
  };
}

function makeRepository(...jobs: LeadGenerationJob[]) {
  const repository = new InMemoryLeadRepository();
  return Promise.all(jobs.map((job) => repository.saveJob(job))).then(
    () => repository
  );
}

const DEPS = {
  discovery: { search: jest.fn() },
  pageSpeed: { analyze: jest.fn() },
  source: 'google_maps' as const
};

describe('rerunLeadGenerationJob', () => {
  beforeEach(() => {
    mockedStartRunLeadJob.mockReset();
  });

  it('re-inputs the stored query and location reusing the same job id', async () => {
    const repository = await makeRepository(makeJob());
    mockedStartRunLeadJob.mockResolvedValue({ ok: true, jobId: 'job-1' });

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result).toEqual({ ok: true, jobId: 'job-1' });
    expect(mockedStartRunLeadJob).toHaveBeenCalledWith(
      { ...DEPS, repository },
      { query: 'autorimessa', location: 'napoli', quantity: 20 },
      { jobId: 'job-1' }
    );
  });

  it('forwards the stored quantity so the re-run matches the original search', async () => {
    const repository = await makeRepository(makeJob({ quantity: 5 }));
    mockedStartRunLeadJob.mockResolvedValue({ ok: true, jobId: 'job-1' });

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result.ok).toBe(true);
    expect(mockedStartRunLeadJob).toHaveBeenCalledWith(
      expect.anything(),
      { query: 'autorimessa', location: 'napoli', quantity: 5 },
      { jobId: 'job-1' }
    );
  });

  it('omits quantity when the job has none stored', async () => {
    const repository = await makeRepository(makeJob({ quantity: undefined }));
    mockedStartRunLeadJob.mockResolvedValue({ ok: true, jobId: 'job-1' });

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result.ok).toBe(true);
    expect(mockedStartRunLeadJob).toHaveBeenCalledWith(
      expect.anything(),
      { query: 'autorimessa', location: 'napoli', quantity: undefined },
      { jobId: 'job-1' }
    );
  });

  it('forwards the stored criteria so the re-run keeps the same constraints', async () => {
    const repository = await makeRepository(
      makeJob({ techStack: 'wordpress', copyright: '© 2019' })
    );
    mockedStartRunLeadJob.mockResolvedValue({ ok: true, jobId: 'job-1' });

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result.ok).toBe(true);
    expect(mockedStartRunLeadJob).toHaveBeenCalledWith(
      expect.anything(),
      {
        query: 'autorimessa',
        location: 'napoli',
        quantity: 20,
        techStack: 'wordpress',
        copyright: '© 2019'
      },
      { jobId: 'job-1' }
    );
  });

  it('refuses to re-run a job that is still running', async () => {
    const repository = await makeRepository(
      makeJob({ status: 'running' })
    );

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result).toEqual({
      ok: false,
      error: 'Questa ricerca è già in corso.'
    });
    expect(mockedStartRunLeadJob).not.toHaveBeenCalled();
  });

  it('refuses to re-run a job that is still pending', async () => {
    const repository = await makeRepository(
      makeJob({ status: 'pending' })
    );

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'job-1'
    );

    expect(result).toEqual({
      ok: false,
      error: 'Questa ricerca è già in corso.'
    });
    expect(mockedStartRunLeadJob).not.toHaveBeenCalled();
  });

  it('returns an error when the job does not exist', async () => {
    const repository = await makeRepository();

    const result = await rerunLeadGenerationJob(
      { ...DEPS, repository },
      'missing-1'
    );

    expect(result).toEqual({ ok: false, error: 'Job non trovato.' });
    expect(mockedStartRunLeadJob).not.toHaveBeenCalled();
  });
});