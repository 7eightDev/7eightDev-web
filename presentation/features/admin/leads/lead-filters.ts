import type { Lead } from '@/domain/lead/lead.types';

/**
 * Pure, framework-agnostic filtering and sorting for the leads list view.
 *
 * Follows the same pattern as quote-filters.ts: URL-driven state, unit-testable
 * logic, orthogonal filter dimensions that compose. Filtering runs against a
 * read model (LeadTableRow[]); when the dataset grows the same shape can be
 * pushed down into the repository as a query.
 */

/* ----------------------------- Status ----------------------------- */

export const LEAD_STATUS_FILTER_VALUES = [
  'all',
  'new',
  'analyzed',
  'qualified',
  'discarded',
] as const;

export type LeadStatusFilter = (typeof LEAD_STATUS_FILTER_VALUES)[number];

export const DEFAULT_LEAD_STATUS_FILTER: LeadStatusFilter = 'all';

export function parseLeadStatusFilter(
  raw: string | undefined
): LeadStatusFilter {
  return LEAD_STATUS_FILTER_VALUES.includes(raw as LeadStatusFilter)
    ? (raw as LeadStatusFilter)
    : DEFAULT_LEAD_STATUS_FILTER;
}

export const LEAD_STATUS_FILTER_LABEL: Record<LeadStatusFilter, string> = {
  all: 'tutti',
  new: 'nuovi',
  analyzed: 'analizzati',
  qualified: 'qualificati',
  discarded: 'scartati',
};

/* ----------------------------- Score ----------------------------- */

export const SCORE_FILTER_VALUES = [
  'all',
  'high',
  'medium',
  'low',
  'none',
] as const;

export type ScoreFilter = (typeof SCORE_FILTER_VALUES)[number];

export const DEFAULT_SCORE_FILTER: ScoreFilter = 'all';

export function parseScoreFilter(raw: string | undefined): ScoreFilter {
  return SCORE_FILTER_VALUES.includes(raw as ScoreFilter)
    ? (raw as ScoreFilter)
    : DEFAULT_SCORE_FILTER;
}

export const SCORE_FILTER_LABEL: Record<ScoreFilter, string> = {
  all: 'tutti',
  high: '≥ 90',
  medium: '50–89',
  low: '< 50',
  none: 'senza analisi',
};

/* ----------------------------- Source ----------------------------- */

export const SOURCE_FILTER_VALUES = [
  'all',
  'google_maps',
  'outscraper',
  'serpapi',
] as const;

export type SourceFilter = (typeof SOURCE_FILTER_VALUES)[number];

export const DEFAULT_SOURCE_FILTER: SourceFilter = 'all';

export function parseSourceFilter(raw: string | undefined): SourceFilter {
  return SOURCE_FILTER_VALUES.includes(raw as SourceFilter)
    ? (raw as SourceFilter)
    : DEFAULT_SOURCE_FILTER;
}

export const SOURCE_FILTER_LABEL: Record<SourceFilter, string> = {
  all: 'tutte',
  google_maps: 'Google Maps',
  outscraper: 'Outscraper',
  serpapi: 'SerpAPI',
};

/* ----------------------------- Sort ----------------------------- */

export const SORT_VALUES = [
  'date-desc',
  'date-asc',
  'name-asc',
  'name-desc',
  'score-asc',
  'score-desc',
] as const;

export type SortOption = (typeof SORT_VALUES)[number];

export const DEFAULT_SORT: SortOption = 'date-desc';

export function parseSortOption(raw: string | undefined): SortOption {
  return SORT_VALUES.includes(raw as SortOption)
    ? (raw as SortOption)
    : DEFAULT_SORT;
}

export const SORT_LABEL: Record<SortOption, string> = {
  'date-desc': 'più recenti',
  'date-asc': 'meno recenti',
  'name-asc': 'A → Z',
  'name-desc': 'Z → A',
  'score-asc': 'score basso',
  'score-desc': 'score alto',
};

/* ----------------------------- Read model ------------------------- */

/** Read model for a lead row — pairs a Lead with its latest score. */
export interface LeadReadModel {
  readonly lead: Lead;
  readonly score?: number;
}

/* ----------------------------- Composition -------------------------- */

export interface LeadFilters {
  readonly status: LeadStatusFilter;
  readonly score: ScoreFilter;
  readonly source: SourceFilter;
  readonly q: string;
  readonly sort: SortOption;
}

/**
 * Apply the active filters to a list of lead rows.
 * Dimensions compose: a lead must pass all active filters to be visible.
 */
export function filterLeads(
  rows: readonly LeadReadModel[],
  filters: LeadFilters
): LeadReadModel[] {
  return rows.filter(({ lead, score }) => {
    // Status filters are strict partitions: each lead carries exactly one
    // status badge, and the "analizzati"/"qualificati" counters on the job
    // card follow the same partition (Trovati >= Analizzati + Qualificati).
    if (filters.status !== 'all' && lead.status !== filters.status) {
      return false;
    }
    if (filters.source !== 'all' && lead.source !== filters.source) {
      return false;
    }
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const haystack = [
        lead.companyName,
        lead.city,
        lead.category,
        lead.website,
        lead.phone,
        lead.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    if (filters.score !== 'all') {
      if (filters.score === 'none') {
        if (score !== undefined) return false;
      } else if (score === undefined) {
        return false;
      } else if (filters.score === 'high' && score < 90) {
        return false;
      } else if (filters.score === 'medium' && (score < 50 || score >= 90)) {
        return false;
      } else if (filters.score === 'low' && score >= 50) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sort lead rows in-place (returns a new array).
 * Nulls/undefined sort to the end for all orderings.
 */
export function sortLeads(
  rows: LeadReadModel[],
  sort: SortOption
): LeadReadModel[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'date-desc':
        return b.lead.createdAt.localeCompare(a.lead.createdAt);
      case 'date-asc':
        return a.lead.createdAt.localeCompare(b.lead.createdAt);
      case 'name-asc':
        return a.lead.companyName.localeCompare(b.lead.companyName);
      case 'name-desc':
        return b.lead.companyName.localeCompare(a.lead.companyName);
      case 'score-asc':
      case 'score-desc': {
        // Undefined scores always sort to the end, regardless of direction.
        const aHas = a.score !== undefined;
        const bHas = b.score !== undefined;
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (!aHas) return 0;
        return sort === 'score-asc'
          ? a.score! - b.score!
          : b.score! - a.score!;
      }
    }
  });
  return sorted;
}
