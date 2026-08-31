export interface PageSpeedInput {
  readonly url: string;
  readonly strategy: 'mobile' | 'desktop';
}

export interface PageSpeedResult {
  readonly performanceScore: number | null;
  readonly lcp: number | null;
  readonly fcp: number | null;
  readonly cls: number | null;
  readonly tbt: number | null;
}

export interface PageSpeedPort {
  analyze(input: PageSpeedInput): Promise<PageSpeedResult>;
}

export class PageSpeedAnalysisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PageSpeedAnalysisError';
  }
}
