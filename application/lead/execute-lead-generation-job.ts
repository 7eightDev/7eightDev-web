import type { LeadGenerationJobRepository } from '@/domain/lead/lead-generation-job.repository';
import type { LeadDiscoveryPort } from '@/domain/lead/lead.discovery';
import type { PageSpeedPort } from '@/domain/lead/lead.pagespeed';
import type { LeadRepository } from '@/domain/lead/lead.repository';

export interface ExecuteLeadGenerationJobInput {
  jobId: string;
}

export interface ExecuteLeadGenerationJobDependencies {
  discovery: LeadDiscoveryPort;
  pageSpeed: PageSpeedPort;
  repository: LeadRepository;
}

export class ExecuteLeadGenerationJob {
  constructor(
    private readonly jobRepository: LeadGenerationJobRepository,
    private readonly dependencies: ExecuteLeadGenerationJobDependencies
  ) {}

  async execute(input: ExecuteLeadGenerationJobInput): Promise<void> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) {
      throw new Error(`Job with id ${input.jobId} not found`);
    }

    await this.jobRepository.updateStatus(job.id, 'running');

    try {
      const results = await this.dependencies.discovery.search({
        query: job.query,
        location: job.location
      });

      let analyzedCount = 0;
      let qualifiedCount = 0;

      for (const result of results) {
        if (result.website) {
          // Passiamo l'oggetto completo rispettando l'interfaccia PageSpeedInput
          await this.dependencies.pageSpeed.analyze({
            url: result.website,
            strategy: 'mobile'
          });
          analyzedCount++;
          qualifiedCount++;
        }
      }

      await this.jobRepository.updateProgress(job.id, {
        totalFound: results.length,
        analyzed: analyzedCount,
        qualified: qualifiedCount
      });

      await this.jobRepository.updateStatus(job.id, 'completed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.jobRepository.updateStatus(job.id, 'failed', errorMessage);
      throw error;
    }
  }
}
