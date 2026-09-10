export type LeadSource = 'google_maps' | 'outscraper' | 'serpapi';

export type LeadStatus = 'new' | 'analyzed' | 'qualified' | 'discarded';

export type LeadOutreachStatus = 'not_contacted' | 'audit_sent' | 'in_talks' | 'closed_won' | 'rejected';

export interface Lead {
  readonly id: string;
  readonly jobId?: string;

  readonly companyName: string;
  readonly category?: string;

  readonly website?: string;
  readonly phone?: string;
  readonly email?: string;

  readonly address?: string;
  readonly city?: string;

  readonly source: LeadSource;
  readonly status: LeadStatus;
  readonly outreachStatus: LeadOutreachStatus;
  readonly lastContactedAt?: string;
  readonly outreachNotes?: string;

  // Set when the PageSpeed analysis failed (lead `discarded`); carries the
  // reason shown in the admin detail view.
  readonly analysisError?: string;

  /** Technologies detected on the lead's website, e.g. ['WordPress', jQuery'] */
  readonly techStack?: readonly string[];

  /** Footer copyright line detected on the lead's website (e.g. "© 2019"),
   *  a signal of when the site was built and thus how stale it is. */
  readonly copyright?: string;

  /** True when the lead's website runs paid-advertising trackers. */
  readonly hasAds?: boolean;

  /** Detected ad-tracking platforms, e.g. ['Google Ads', 'Meta Pixel', 'GTM']. */
  readonly adsTrackers?: readonly string[];

  /** Pinned via the star in the leads list: leads the user intends to contact.
   *  Optional because the pipeline creates leads without the flag; the UI
   *  treats a missing value as not-favorite. */
  readonly favorite?: boolean;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadAnalysis {
  readonly id: string;
  readonly leadId: string;

  readonly strategy: 'mobile' | 'desktop';

  readonly performanceScore?: number;
  readonly lcp?: number;
  readonly fcp?: number;
  readonly cls?: number;
  readonly tbt?: number;

  readonly analyzedAt: string;
}

export type LeadGenerationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface LeadGenerationJob {
  readonly id: string;

  readonly query: string;
  readonly location: string;
  readonly quantity?: number;

  /** Optional tech/stack term the search was narrowed by (e.g. "wordpress"). */
  readonly techStack?: string;
  /** Optional free-text copyright criterion the site footer should contain. */
  readonly copyright?: string;

  readonly status: LeadGenerationJobStatus;

  readonly totalFound: number;
  readonly analyzed: number;
  readonly qualified: number;

  /** Pinned to the top of the recent-searches sidebar via the star toggle.
   *  Optional because the pipeline creates jobs without the flag; the UI
   *  treats a missing value as not-favorite. */
  readonly favorite?: boolean;

  readonly startedAt?: string;
  readonly completedAt?: string;

  readonly error?: string;

  readonly createdAt: string;
}
