import type { LeadGenerationJobRepository } from '@/domain/lead/lead-generation-job.repository';
import type {
  LeadGenerationJob,
  CreateLeadGenerationJobInput,
  UpdateLeadGenerationJobProgressInput
} from '@/domain/lead/lead-generation-job.types';

export class InMemoryLeadGenerationJobRepository implements LeadGenerationJobRepository {
  private readonly jobs = new Map<string, LeadGenerationJob>();

  async create(
    input: CreateLeadGenerationJobInput
  ): Promise<LeadGenerationJob> {
    const now = new Date();
    const job: LeadGenerationJob = {
      id: crypto.randomUUID(),
      query: input.query,
      location: input.location,
      status: 'pending',
      progress: {
        totalFound: 0,
        analyzed: 0,
        qualified: 0
      },
      createdAt: now,
      updatedAt: now
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<LeadGenerationJob | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async updateStatus(
    id: string,
    status: LeadGenerationJob['status'],
    error?: string
  ): Promise<LeadGenerationJob> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }

    const now = new Date();
    const updatedJob: LeadGenerationJob = {
      ...job,
      status,
      error: error ?? job.error,
      startedAt: status === 'running' ? now : job.startedAt,
      completedAt:
        status === 'completed' || status === 'failed' ? now : job.completedAt,
      updatedAt: now
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateProgress(
    id: string,
    progress: UpdateLeadGenerationJobProgressInput
  ): Promise<LeadGenerationJob> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }

    const now = new Date();
    const updatedJob: LeadGenerationJob = {
      ...job,
      progress: {
        totalFound: progress.totalFound ?? job.progress.totalFound,
        analyzed: progress.analyzed ?? job.progress.analyzed,
        qualified: progress.qualified ?? job.progress.qualified
      },
      updatedAt: now
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }
}
