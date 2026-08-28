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
      delete: jest.fn()
    },
    leadAnalysis: {
      findMany: jest.fn(),
      upsert: jest.fn()
    },
    leadGenerationJob: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    }
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
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
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
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
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
  it('finds a lead by id', async () => {
    const repository = new PrismaLeadRepository();
    const row: LeadModel = {
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
        companyName: 'Acme',
        category: 'Web Agency',
        website: 'https://example.com',
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
        companyName: 'Beta',
        category: 'Software',
        website: 'https://beta.com',
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
});
