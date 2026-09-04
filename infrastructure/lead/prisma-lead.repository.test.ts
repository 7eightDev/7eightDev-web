import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';
import { prisma } from '@/infrastructure/db/prisma';
import { PrismaLeadRepository } from '@/infrastructure/lead/prisma-lead.repository';
import type { LeadModel } from '@/infrastructure/db/generated/models/Lead';
import { LeadGenerationJobStatus } from '@/infrastructure/db/generated/enums';

jest.mock('@/infrastructure/db/prisma', () => ({
  prisma: {
    lead: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn()
    },
    leadAnalysis: {
      findMany: jest.fn(),
      upsert: jest.fn()
    },
    leadGenerationJob: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn()
    },
    $queryRaw: jest.fn()
  }
}));

describe('PrismaLeadRepository', () => {
  it('saves a lead using upsert', async () => {
    const repository = new PrismaLeadRepository();

    const lead: Lead = {
      id: 'lead-1',
      companyName: 'Acme',
      category: 'Web Agency',
      website: 'https://example.com',
      phone: '+39 123456789',
      email: 'hello@example.com',
      address: 'Via Roma 1',
      city: 'Padova',
      source: 'google_maps',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    await repository.save(lead);

    expect(prisma.lead.upsert).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      create: {
        id: 'lead-1',
        jobId: null,
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
        websiteKey: 'example.com',
        phone: '+39 123456789',
        email: 'hello@example.com',
        address: 'Via Roma 1',
        city: 'Padova',
        source: 'google_maps',
        status: 'new',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z')
      },
      update: {
        jobId: null,
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
        websiteKey: 'example.com',
        phone: '+39 123456789',
        email: 'hello@example.com',
        address: 'Via Roma 1',
        city: 'Padova',
        source: 'google_maps',
        status: 'new',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z')
      }
    });
  });
  it('persists the jobId on save when present', async () => {
    const repository = new PrismaLeadRepository();

    const lead: Lead = {
      id: 'lead-1',
      jobId: 'job-9',
      companyName: 'Acme',
      website: 'https://example.com',
      source: 'google_maps',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    await repository.save(lead);

    const expected = {
      jobId: 'job-9',
      companyName: 'Acme',
      category: null,
      website: 'https://example.com',
      websiteKey: 'example.com',
      phone: null,
      email: null,
      address: null,
      city: null,
      source: 'google_maps',
      status: 'new',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };

    expect(prisma.lead.upsert).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      create: { id: 'lead-1', ...expected },
      update: expected
    });
  });
  it('finds a lead by id', async () => {
    const repository = new PrismaLeadRepository();
    const row: LeadModel = {
      id: 'lead-1',
      jobId: null,
      companyName: 'Acme',
      category: 'Web Agency',
      website: 'https://example.com',
      websiteKey: 'example.com',
      phone: '+39 123456789',
      email: 'hello@example.com',
      address: 'Via Roma 1',
      city: 'Padova',
      source: 'google_maps',
      status: 'new',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    jest.mocked(prisma.lead.findUnique).mockResolvedValue(row);
    const result = await repository.findById('lead-1');
    expect(prisma.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 'lead-1' }
    });
    expect(result).toEqual({
      id: 'lead-1',
      companyName: 'Acme',
      category: 'Web Agency',
      website: 'https://example.com',
      phone: '+39 123456789',
      email: 'hello@example.com',
      address: 'Via Roma 1',
      city: 'Padova',
      source: 'google_maps',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
  });
  it('finds all leads', async () => {
    const repository = new PrismaLeadRepository();

    const rows: LeadModel[] = [
      {
        id: 'lead-1',
        jobId: null,
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
        websiteKey: 'example.com',
        phone: '+39 123456789',
        email: 'hello@example.com',
        address: 'Via Roma 1',
        city: 'Padova',
        source: 'google_maps',
        status: 'new',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z')
      },
      {
        id: 'lead-2',
        jobId: null,
        companyName: 'Beta',
        category: 'Software',
        website: 'https://beta.com',
        websiteKey: 'beta.com',
        phone: '+39 987654321',
        email: 'info@beta.com',
        address: 'Via Milano 2',
        city: 'Vicenza',
        source: 'google_maps',
        status: 'new',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z')
      }
    ];

    jest.mocked(prisma.lead.findMany).mockResolvedValue(rows);

    const result = await repository.findAll();

    expect(prisma.lead.findMany).toHaveBeenCalledWith();

    expect(result).toEqual([
      {
        id: 'lead-1',
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
        phone: '+39 123456789',
        email: 'hello@example.com',
        address: 'Via Roma 1',
        city: 'Padova',
        source: 'google_maps',
        status: 'new',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'lead-2',
        companyName: 'Beta',
        category: 'Software',
        website: 'https://beta.com',
        phone: '+39 987654321',
        email: 'info@beta.com',
        address: 'Via Milano 2',
        city: 'Vicenza',
        source: 'google_maps',
        status: 'new',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z'
      }
    ]);
  });
  it('deletes a lead by id', async () => {
    const repository = new PrismaLeadRepository();

    await repository.delete('lead-1');

    expect(prisma.lead.delete).toHaveBeenCalledWith({
      where: { id: 'lead-1' }
    });
  });
  it('finds analyses by lead id', async () => {
    const repository = new PrismaLeadRepository();

    const row = {
      id: 'analysis-1',
      leadId: 'lead-1',
      strategy: 'mobile',
      performanceScore: 42,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null,
      analyzedAt: new Date('2026-08-28T10:05:00.000Z')
    };

    jest.mocked(prisma.leadAnalysis.findMany).mockResolvedValue([row]);

    const result = await repository.findAnalysesByLeadId('lead-1');

    expect(prisma.leadAnalysis.findMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' }
    });

    expect(result).toEqual([
      {
        id: 'analysis-1',
        leadId: 'lead-1',
        strategy: 'mobile',
        performanceScore: 42,
        analyzedAt: '2026-08-28T10:05:00.000Z'
      }
    ]);
  });
  it('saves a lead analysis using upsert', async () => {
    const repository = new PrismaLeadRepository();

    const analysis: LeadAnalysis = {
      id: 'analysis-1',
      leadId: 'lead-1',
      strategy: 'mobile',
      performanceScore: 42,
      analyzedAt: '2026-08-28T10:05:00.000Z'
    };

    await repository.saveAnalysis(analysis);

    expect(prisma.leadAnalysis.upsert).toHaveBeenCalledWith({
      where: {
        id: 'analysis-1'
      },
      create: {
        id: 'analysis-1',
        leadId: 'lead-1',
        strategy: 'mobile',
        performanceScore: 42,
        analyzedAt: new Date('2026-08-28T10:05:00.000Z')
      },
      update: {
        leadId: 'lead-1',
        strategy: 'mobile',
        performanceScore: 42,
        analyzedAt: new Date('2026-08-28T10:05:00.000Z')
      }
    });
  });
  it('finds a job by id', async () => {
    const repository = new PrismaLeadRepository();

    const row = {
      id: 'job-1',
      query: 'web agencies',
      location: 'Padova',
      status: LeadGenerationJobStatus.pending,
      totalFound: 10,
      analyzed: 5,
      qualified: 2,
      startedAt: new Date('2026-08-28T10:00:00.000Z'),
      completedAt: null,
      error: null,
      createdAt: new Date('2026-08-28T09:55:00.000Z')
    };

    jest.mocked(prisma.leadGenerationJob.findUnique).mockResolvedValue(row);

    const result = await repository.findJobById('job-1');

    expect(prisma.leadGenerationJob.findUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' }
    });

    expect(result).toEqual({
      id: 'job-1',
      query: 'web agencies',
      location: 'Padova',
      status: 'pending',
      totalFound: 10,
      analyzed: 5,
      qualified: 2,
      startedAt: '2026-08-28T10:00:00.000Z',
      completedAt: undefined,
      error: undefined,
      createdAt: '2026-08-28T09:55:00.000Z'
    });
  });
  it('finds all jobs', async () => {
    const repository = new PrismaLeadRepository();

    const rows = [
      {
        id: 'job-1',
        query: 'web agencies',
        location: 'Padova',
        status: LeadGenerationJobStatus.completed,
        totalFound: 10,
        analyzed: 5,
        qualified: 2,
        startedAt: new Date('2026-08-28T10:00:00.000Z'),
        completedAt: new Date('2026-08-28T10:30:00.000Z'),
        error: null,
        createdAt: new Date('2026-08-28T09:55:00.000Z')
      },
      {
        id: 'job-2',
        query: 'dentists',
        location: 'Milano',
        status: LeadGenerationJobStatus.pending,
        totalFound: 0,
        analyzed: 0,
        qualified: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: new Date('2026-08-29T10:00:00.000Z')
      }
    ];

    jest.mocked(prisma.leadGenerationJob.findMany).mockResolvedValue(rows);

    const result = await repository.findAllJobs();

    expect(prisma.leadGenerationJob.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' }
    });

    expect(result).toEqual([
      {
        id: 'job-1',
        query: 'web agencies',
        location: 'Padova',
        status: 'completed',
        totalFound: 10,
        analyzed: 5,
        qualified: 2,
        startedAt: '2026-08-28T10:00:00.000Z',
        completedAt: '2026-08-28T10:30:00.000Z',
        error: undefined,
        createdAt: '2026-08-28T09:55:00.000Z'
      },
      {
        id: 'job-2',
        query: 'dentists',
        location: 'Milano',
        status: 'pending',
        totalFound: 0,
        analyzed: 0,
        qualified: 0,
        startedAt: undefined,
        completedAt: undefined,
        error: undefined,
        createdAt: '2026-08-29T10:00:00.000Z'
      }
    ]);
  });
  it('saves a job using upsert', async () => {
    const repository = new PrismaLeadRepository();

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

    await repository.saveJob(job);

    expect(prisma.leadGenerationJob.upsert).toHaveBeenCalledWith({
      where: {
        id: 'job-1'
      },
      create: {
        id: 'job-1',
        query: 'dentist',
        location: 'Padova',
        status: 'pending',
        totalFound: 0,
        analyzed: 0,
        qualified: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: new Date('2026-08-28T10:00:00.000Z')
      },
      update: {
        query: 'dentist',
        location: 'Padova',
        status: 'pending',
        totalFound: 0,
        analyzed: 0,
        qualified: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        createdAt: new Date('2026-08-28T10:00:00.000Z')
      }
    });
  });
  it('finds paginated leads with filters', async () => {
    const repository = new PrismaLeadRepository();

    const rows: LeadModel[] = [
      {
        id: 'lead-1',
        jobId: 'job-1',
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
        websiteKey: 'example.com',
        phone: null,
        email: null,
        address: null,
        city: 'Padova',
        source: 'google_maps',
        status: 'new',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z')
      }
    ];

    jest.mocked(prisma.lead.findMany).mockResolvedValue(rows);
    jest.mocked(prisma.lead.count).mockResolvedValue(1);

const result = await repository.findPaginated({
      page: 1,
      pageSize: 20,
      status: 'new',
      jobId: 'job-1',
      q: 'acme'
    });

    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: {
        status: 'new',
        jobId: 'job-1',
        OR: [
          { companyName: { contains: 'acme', mode: 'insensitive' } },
          { city: { contains: 'acme', mode: 'insensitive' } },
          { category: { contains: 'acme', mode: 'insensitive' } },
          { website: { contains: 'acme', mode: 'insensitive' } },
          { phone: { contains: 'acme', mode: 'insensitive' } },
          { email: { contains: 'acme', mode: 'insensitive' } }
        ]
      }
    });

    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: {
        status: 'new',
        jobId: 'job-1',
        OR: [
          { companyName: { contains: 'acme', mode: 'insensitive' } },
          { city: { contains: 'acme', mode: 'insensitive' } },
          { category: { contains: 'acme', mode: 'insensitive' } },
          { website: { contains: 'acme', mode: 'insensitive' } },
          { phone: { contains: 'acme', mode: 'insensitive' } },
          { email: { contains: 'acme', mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20
    });

    expect(result).toEqual({
      leads: [
        {
          id: 'lead-1',
          jobId: 'job-1',
          companyName: 'Acme',
          category: 'Web Agency',
          website: 'https://example.com',
          phone: undefined,
          email: undefined,
          address: undefined,
          city: 'Padova',
          source: 'google_maps',
          status: 'new',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      total: 1
    });
  });
  it('finds latest analyses by lead ids', async () => {
    const repository = new PrismaLeadRepository();

    const rawRows = [
      {
        id: 'analysis-2',
        leadId: 'lead-1',
        strategy: 'mobile',
        performanceScore: 65,
        lcp: 3.2,
        fcp: 1.8,
        cls: 0.05,
        tbt: 200,
        analyzedAt: new Date('2026-08-29T10:00:00.000Z')
      },
      {
        id: 'analysis-3',
        leadId: 'lead-2',
        strategy: 'desktop',
        performanceScore: 88,
        lcp: 1.5,
        fcp: 0.8,
        cls: 0.01,
        tbt: 50,
        analyzedAt: new Date('2026-08-30T12:00:00.000Z')
      }
    ];

    jest
      .mocked(prisma.$queryRaw)
      .mockResolvedValue(rawRows);

    const result = await repository.findLatestAnalysesByLeadIds([
      'lead-1',
      'lead-2'
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'analysis-2',
      leadId: 'lead-1',
      strategy: 'mobile',
      performanceScore: 65,
      lcp: 3.2,
      fcp: 1.8,
      cls: 0.05,
      tbt: 200,
      analyzedAt: '2026-08-29T10:00:00.000Z'
    });
    expect(result[1]).toEqual({
      id: 'analysis-3',
      leadId: 'lead-2',
      strategy: 'desktop',
      performanceScore: 88,
      lcp: 1.5,
      fcp: 0.8,
      cls: 0.01,
      tbt: 50,
      analyzedAt: '2026-08-30T12:00:00.000Z'
    });
  });
  it('returns empty array for findLatestAnalysesByLeadIds with empty input', async () => {
    const repository = new PrismaLeadRepository();
    const result = await repository.findLatestAnalysesByLeadIds([]);
    expect(result).toEqual([]);
  });
  it('checks existsByWebsiteKey returns true when lead exists', async () => {
    const repository = new PrismaLeadRepository();
    jest.mocked(prisma.lead.findUnique).mockResolvedValue({ id: 'lead-1' } as never);
    const result = await repository.existsByWebsiteKey('acme.it');
    expect(result).toBe(true);
    expect(prisma.lead.findUnique).toHaveBeenCalledWith({
      where: { websiteKey: 'acme.it' },
      select: { id: true }
    });
  });
  it('checks existsByWebsiteKey returns false when lead not found', async () => {
    const repository = new PrismaLeadRepository();
    jest.mocked(prisma.lead.findUnique).mockResolvedValue(null);
    const result = await repository.existsByWebsiteKey('missing.it');
    expect(result).toBe(false);
  });
});
