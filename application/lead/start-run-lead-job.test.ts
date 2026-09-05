import { startRunLeadJob } from '@/application/lead/start-run-lead-job';
import { InMemoryLeadRepository } from '@/infrastructure/lead/in-memory-lead.repository';

const tick = () => new Promise((resolve) => setTimeout(resolve, 60));

describe('startRunLeadJob', () => {
  it('persists the job as running and drives it to completed in the background', async () => {
    const repository = new InMemoryLeadRepository();
    const discovery = {
      search: jest.fn().mockResolvedValue([
        { companyName: 'Acme', website: 'https://acme.example' }
      ])
    };
    const pageSpeed = {
      analyze: jest.fn().mockResolvedValue({
        performanceScore: 49,
        lcp: null,
        fcp: null,
        cls: null,
        tbt: null
      })
    };

    const result = await startRunLeadJob(
      { discovery, pageSpeed, repository },
      { query: 'dentisti', location: 'Milano', quantity: 1 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((await repository.findJobById(result.jobId))?.status).toBe(
        'running'
      );
    }

    await tick();

    if (result.ok) {
      const job = await repository.findJobById(result.jobId);
      expect(job?.status).toBe('completed');
      expect(job?.analyzed).toBe(0);
      expect(job?.qualified).toBe(1);
    }
  });

  it('marks the job failed when an unhandled pipeline error occurs', async () => {
    class ThrowingSaveRepository extends InMemoryLeadRepository {
      override async save(): Promise<void> {
        throw new Error('disk full');
      }
    }
    const repository = new ThrowingSaveRepository();
    const discovery = {
      search: jest.fn().mockResolvedValue([{ companyName: 'Acme' }])
    };
    const pageSpeed = { analyze: jest.fn() };

    const result = await startRunLeadJob(
      { discovery, pageSpeed, repository },
      { query: 'dentisti', location: 'Milano', quantity: 1 }
    );

    expect(result.ok).toBe(true);

    await tick();

    if (result.ok) {
      const job = await repository.findJobById(result.jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('Pipeline interrotta');
      expect(job?.error).toContain('disk full');
    }
  });
});