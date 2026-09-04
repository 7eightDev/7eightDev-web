import type {
  LeadPage,
  LeadPageParams,
  LeadRepository
} from '@/domain/lead/lead.repository';
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';
import { prisma } from '@/infrastructure/db/prisma';
import {
  LeadAnalysisRow,
  type LeadGenerationJobRow,
  type LeadRow,
  leadToRow,
  rowToLead,
  rowToLeadAnalysis,
  rowToLeadGenerationJob
} from '@/infrastructure/lead/lead.mapper';

export class PrismaLeadRepository implements LeadRepository {
  async save(lead: Lead): Promise<void> {
    const row = leadToRow(lead);

    const data = {
      companyName: row.companyName,
      category: row.category,
      website: row.website,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: row.city,
      source: row.source,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    await prisma.lead.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        ...data
      },
      update: data
    });
  }

  async findById(id: string): Promise<Lead | null> {
    const row = await prisma.lead.findUnique({
      where: { id }
    });

    return row ? rowToLead(row as unknown as LeadRow) : null;
  }

  async findAll(): Promise<Lead[]> {
    const rows = await prisma.lead.findMany();

    return rows.map(rowToLead);
  }

  async findPaginated({
    page,
    pageSize,
    status,
    source,
    q
  }: LeadPageParams): Promise<LeadPage> {
    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (source && source !== 'all') {
      where.source = source;
    }
    if (q) {
      const term = q.toLowerCase();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { website: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      leads: rows.map((r) => rowToLead(r as unknown as LeadRow)),
      total
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.lead.delete({
      where: { id }
    });
  }

  async findAnalysesByLeadId(leadId: string): Promise<LeadAnalysis[]> {
    const rows = await prisma.leadAnalysis.findMany({
      where: { leadId }
    });

    return rows.map((row) => rowToLeadAnalysis(row as LeadAnalysisRow));
  }

  async findLatestAnalysesByLeadIds(leadIds: string[]): Promise<LeadAnalysis[]> {
    if (leadIds.length === 0) return [];

    const rows = await prisma.$queryRaw<
      { id: string; leadId: string; strategy: string; performanceScore: number | null; lcp: number | null; fcp: number | null; cls: number | null; tbt: number | null; analyzedAt: Date }[]
    >`
      SELECT DISTINCT ON ("leadId")
        "id", "leadId", "strategy", "performanceScore", "lcp", "fcp", "cls", "tbt", "analyzedAt"
      FROM "LeadAnalysis"
      WHERE "leadId" = ANY(${leadIds})
      ORDER BY "leadId", "analyzedAt" DESC
    `;

    return rows.map((row) =>
      rowToLeadAnalysis({
        id: row.id,
        leadId: row.leadId,
        strategy: row.strategy as 'mobile' | 'desktop',
        performanceScore: row.performanceScore,
        lcp: row.lcp,
        fcp: row.fcp,
        cls: row.cls,
        tbt: row.tbt,
        analyzedAt: row.analyzedAt
      })
    );
  }

  async saveAnalysis(analysis: LeadAnalysis): Promise<void> {
    await prisma.leadAnalysis.upsert({
      where: {
        id: analysis.id
      },
      create: {
        id: analysis.id,
        leadId: analysis.leadId,
        strategy: analysis.strategy,
        performanceScore: analysis.performanceScore,
        lcp: analysis.lcp,
        fcp: analysis.fcp,
        cls: analysis.cls,
        tbt: analysis.tbt,
        analyzedAt: new Date(analysis.analyzedAt)
      },
      update: {
        leadId: analysis.leadId,
        strategy: analysis.strategy,
        performanceScore: analysis.performanceScore,
        lcp: analysis.lcp,
        fcp: analysis.fcp,
        cls: analysis.cls,
        tbt: analysis.tbt,
        analyzedAt: new Date(analysis.analyzedAt)
      }
    });
  }

  async findJobById(id: string): Promise<LeadGenerationJob | null> {
    const row = await prisma.leadGenerationJob.findUnique({
      where: { id }
    });

    if (!row) {
      return null;
    }

    return rowToLeadGenerationJob(row as LeadGenerationJobRow);
  }

  async findAllJobs(): Promise<LeadGenerationJob[]> {
    const rows = await prisma.leadGenerationJob.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((row) => rowToLeadGenerationJob(row as LeadGenerationJobRow));
  }

  async saveJob(job: LeadGenerationJob): Promise<void> {
    await prisma.leadGenerationJob.upsert({
      where: {
        id: job.id
      },
      create: {
        id: job.id,
        query: job.query,
        location: job.location,
        status: job.status,
        totalFound: job.totalFound,
        analyzed: job.analyzed,
        qualified: job.qualified,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
        error: job.error ?? null,
        createdAt: new Date(job.createdAt)
      },
      update: {
        query: job.query,
        location: job.location,
        status: job.status,
        totalFound: job.totalFound,
        analyzed: job.analyzed,
        qualified: job.qualified,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
        error: job.error ?? null,
        createdAt: new Date(job.createdAt)
      }
    });
  }
}
