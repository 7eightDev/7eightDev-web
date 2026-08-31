import { PrismaClient } from '@/infrastructure/db/generated/client';
import { LeadGenerationJobRepository } from '@/domain/lead/lead-generation-job.repository';
import {
  LeadGenerationJob,
  CreateLeadGenerationJobInput,
  UpdateLeadGenerationJobProgressInput
} from '@/domain/lead/lead-generation-job.types';

export class PrismaLeadGenerationJobRepository implements LeadGenerationJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: CreateLeadGenerationJobInput
  ): Promise<LeadGenerationJob> {
    const record = await this.prisma.leadGenerationJob.create({
      data: {
        id: crypto.randomUUID(),
        query: input.query,
        location: input.location,
        status: 'pending',
        totalFound: 0,
        analyzed: 0,
        qualified: 0
      }
    });

    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<LeadGenerationJob | null> {
    const record = await this.prisma.leadGenerationJob.findUnique({
      where: { id }
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async updateStatus(
    id: string,
    status: LeadGenerationJob['status'],
    error?: string
  ): Promise<LeadGenerationJob> {
    const now = new Date();
    const record = await this.prisma.leadGenerationJob.update({
      where: { id },
      data: {
        status,
        error: error ?? null,
        startedAt: status === 'running' ? now : undefined,
        completedAt:
          status === 'completed' || status === 'failed' ? now : undefined
      }
    });

    return this.mapToDomain(record);
  }

  async updateProgress(
    id: string,
    progress: UpdateLeadGenerationJobProgressInput
  ): Promise<LeadGenerationJob> {
    const record = await this.prisma.leadGenerationJob.update({
      where: { id },
      data: {
        ...(progress.totalFound !== undefined && {
          totalFound: progress.totalFound
        }),
        ...(progress.analyzed !== undefined && { analyzed: progress.analyzed }),
        ...(progress.qualified !== undefined && {
          qualified: progress.qualified
        })
      }
    });

    return this.mapToDomain(record);
  }

  private mapToDomain(record: {
    id: string;
    query: string;
    location: string;
    status: string;
    totalFound: number;
    analyzed: number;
    qualified: number;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt?: Date; // <-- Reso opzionale nel parametro d'ingresso per tollerare i valori mancanti
  }): LeadGenerationJob {
    return {
      id: record.id,
      query: record.query,
      location: record.location,
      status: record.status as LeadGenerationJob['status'],
      progress: {
        totalFound: record.totalFound,
        analyzed: record.analyzed,
        qualified: record.qualified
      },
      error: record.error ?? undefined,
      startedAt: record.startedAt ?? undefined,
      completedAt: record.completedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt ?? record.createdAt // Fallback sicuro a createdAt se updatedAt è vuoto
    };
  }
}
