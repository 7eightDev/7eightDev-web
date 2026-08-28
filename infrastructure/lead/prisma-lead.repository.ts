import type { LeadRepository } from '@/domain/lead/lead.repository';
import type {
  Lead,
  LeadAnalysis,
  LeadGenerationJob
} from '@/domain/lead/lead.types';
import { prisma } from '@/infrastructure/db/prisma';
import {
  LeadAnalysisRow,
  type LeadRow,
  leadToRow,
  rowToLead,
  rowToLeadAnalysis
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
        analyzedAt: new Date(analysis.analyzedAt)
      },
      update: {
        leadId: analysis.leadId,
        strategy: analysis.strategy,
        performanceScore: analysis.performanceScore,
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

    return {
      id: row.id,
      query: row.query,
      location: row.location,
      status: row.status,
      totalFound: row.totalFound,
      analyzed: row.analyzed,
      qualified: row.qualified,
      startedAt: row.startedAt ? row.startedAt.toISOString() : undefined,
      completedAt: undefined,
      error: undefined,
      createdAt: row.createdAt.toISOString()
    };
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
