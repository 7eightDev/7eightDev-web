import { InMemoryLeadRepository } from '@/infrastructure/lead/in-memory-lead.repository';
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';

describe('InMemoryLeadRepository', () => {
  const lead: Lead = {
    id: 'lead-1',
    companyName: 'Acme',
    source: 'google_maps',
    status: 'new',
    createdAt: '2026-08-28T10:00:00.000Z',
    updatedAt: '2026-08-28T10:00:00.000Z'
  };

  const analysis: LeadAnalysis = {
    id: 'analysis-1',
    leadId: 'lead-1',
    strategy: 'mobile',
    performanceScore: 42,
    analyzedAt: '2026-08-28T10:05:00.000Z'
  };

  const job: LeadGenerationJob = {
    id: 'job-1',
    query: 'dentist',
    location: 'Padova',
    status: 'pending',
    totalFound: 0,
    analyzed: 0,
    qualified: 0,
    createdAt: '2026-08-28T10:00:00.000Z'
  };

  it('saves and finds a lead by id', async () => {
    const repository = new InMemoryLeadRepository();

    await repository.save(lead);

    await expect(repository.findById('lead-1')).resolves.toEqual(lead);
  });

  it('returns null when a lead does not exist', async () => {
    const repository = new InMemoryLeadRepository();

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('returns all leads', async () => {
    const repository = new InMemoryLeadRepository();

    await repository.save(lead);

    await expect(repository.findAll()).resolves.toEqual([lead]);
  });

  it('deletes a lead', async () => {
    const repository = new InMemoryLeadRepository();

    await repository.save(lead);
    await repository.delete('lead-1');

    await expect(repository.findById('lead-1')).resolves.toBeNull();
  });

  it('saves and finds analyses by lead id', async () => {
    const repository = new InMemoryLeadRepository();

    await repository.saveAnalysis(analysis);

    await expect(repository.findAnalysesByLeadId('lead-1')).resolves.toEqual([
      analysis
    ]);
  });

  it('returns an empty array when a lead has no analyses', async () => {
    const repository = new InMemoryLeadRepository();

    await expect(repository.findAnalysesByLeadId('missing')).resolves.toEqual(
      []
    );
  });

  it('saves and finds a job by id', async () => {
    const repository = new InMemoryLeadRepository();

    await repository.saveJob(job);

    await expect(repository.findJobById('job-1')).resolves.toEqual(job);
  });

  it('returns null when a job does not exist', async () => {
    const repository = new InMemoryLeadRepository();

    await expect(repository.findJobById('missing')).resolves.toBeNull();
  });
});
