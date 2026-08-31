import { ExecuteLeadGenerationJob } from './execute-lead-generation-job';
import { InMemoryLeadGenerationJobRepository } from '@/infrastructure/lead/in-memory-lead-generation-job.repository';
import type { LeadDiscoveryPort } from '@/domain/lead/lead.discovery';
import type { PageSpeedPort } from '@/domain/lead/lead.pagespeed';
import type { LeadRepository } from '@/domain/lead/lead.repository';

describe('ExecuteLeadGenerationJob', () => {
  let jobRepository: InMemoryLeadGenerationJobRepository;
  let mockDiscovery: jest.Mocked<LeadDiscoveryPort>;
  let mockPageSpeed: jest.Mocked<PageSpeedPort>;
  let mockLeadRepository: jest.Mocked<LeadRepository>;
  let useCase: ExecuteLeadGenerationJob;

  beforeEach(() => {
    jobRepository = new InMemoryLeadGenerationJobRepository();

    mockDiscovery = {
      search: jest.fn().mockResolvedValue([
        {
          companyName: 'Studio Medico Rossi',
          website: 'https://rossimedico.it',
          category: 'Dentista'
        }
      ])
    };

    mockPageSpeed = {
      analyze: jest.fn().mockResolvedValue({
        performanceScore: 40,
        lcp: 3.5,
        fcp: 2.1,
        cls: 0.1,
        tbt: 150
      })
    };

    mockLeadRepository = {
      save: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      saveAnalysis: jest.fn(),
      findAnalysesByLeadId: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      findJobById: jest.fn(),
      saveJob: jest.fn()
    } as unknown as jest.Mocked<LeadRepository>;

    useCase = new ExecuteLeadGenerationJob(jobRepository, {
      discovery: mockDiscovery,
      pageSpeed: mockPageSpeed,
      repository: mockLeadRepository
    });
  });

  it('dovrebbe eseguire il job e coordinare la pipeline', async () => {
    const job = await jobRepository.create({
      query: 'Dentisti',
      location: 'Milano'
    });

    await useCase.execute({ jobId: job.id });

    const updatedJob = await jobRepository.findById(job.id);

    expect(mockDiscovery.search).toHaveBeenCalledWith({
      query: 'Dentisti',
      location: 'Milano'
    });
    expect(mockPageSpeed.analyze).toHaveBeenCalled();
    expect(updatedJob).not.toBeNull();
    expect(updatedJob?.status).toBe('completed');
    expect(updatedJob?.progress).toEqual({
      totalFound: 1,
      analyzed: 1,
      qualified: 1
    });
    expect(updatedJob?.createdAt).toBeInstanceOf(Date);
  });
});
