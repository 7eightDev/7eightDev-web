import { extractCopyrightYear, leadMatchesYearRange } from '@/domain/lead/lead.copyright';
import type { Lead } from '@/domain/lead/lead.types';

/** Extract unique tech-stack names (sorted) from a list of leads. */
export function uniqueTechStacks(leads: readonly Lead[]): string[] {
  const set = new Set<string>();
  for (const lead of leads) {
    for (const tech of lead.techStack ?? []) {
      set.add(tech);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Extract unique footer years (sorted ascending) from a list of leads. */
export function uniqueCopyrightYears(leads: readonly Lead[]): number[] {
  const set = new Set<number>();
  for (const lead of leads) {
    const year = extractCopyrightYear(lead.copyright);
    if (year !== undefined) set.add(year);
  }
  return [...set].sort((a, b) => a - b);
}

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

/* ----------------------------- Ads ----------------------------- */

export const ADS_FILTER_VALUES = ['all', 'with', 'without'] as const;

export type AdsFilter = (typeof ADS_FILTER_VALUES)[number];

export const DEFAULT_ADS_FILTER: AdsFilter = 'all';

export function parseAdsFilter(raw: string | undefined): AdsFilter {
  return ADS_FILTER_VALUES.includes(raw as AdsFilter)
    ? (raw as AdsFilter)
    : DEFAULT_ADS_FILTER;
}

export const ADS_FILTER_LABEL: Record<AdsFilter, string> = {
  all: 'Tutti',
  with: 'Con Ads Attive',
  without: 'Senza Ads',
};

/* ----------------------------- Tech Stack (multiselect) ---------- */

/** Comma-separated tech names in the URL, e.g. "WordPress,React". */
export type TechStackFilter = string[];

export const DEFAULT_TECH_STACK_FILTER: TechStackFilter = [];

export function parseTechStackFilter(
  raw: string | undefined
): TechStackFilter {
  if (!raw) return DEFAULT_TECH_STACK_FILTER;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Serialise a tech-stack filter array back to a URL-safe comma string. */
export function serializeTechStackFilter(techs: TechStackFilter): string {
  return techs.join(',');
}

/* ----------------------------- Copyright (year range) ------------ */

/** Parse a "YYYY" URL value; undefined when absent or not a plausible year. */
export function parseYearFilter(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  if (!/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= 1900 && year <= 2100 ? year : undefined;
}

/* ----------------------------- Sort ----------------------------- */

export const SORT_VALUES = [
  'date-desc',
  'date-asc',
  'name-asc',
  'name-desc',
  'city-asc',
  'city-desc',
  'score-asc',
  'score-desc',
  'status-asc',
  'status-desc',
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
  'city-asc': 'A → Z',
  'city-desc': 'Z → A',
  'score-asc': 'score basso',
  'score-desc': 'score alto',
  'status-asc': 'stato A → Z',
  'status-desc': 'stato Z → A',
};

/** Maps a table column key to its ascending sort value. */
export const COLUMN_SORT_KEY: Partial<Record<string, SortOption>> = {
  company: 'name-asc',
  city: 'city-asc',
  score: 'score-desc',
  status: 'status-asc',
};

/** Given a column key and current sort, return the toggled sort option. */
export function toggleColumnSort(
  column: string,
  currentSort: SortOption
): SortOption | null {
  const asc = COLUMN_SORT_KEY[column];
  if (!asc) return null;
  const [field] = asc.split('-');
  const desc = `${field}-desc` as SortOption;
  // For columns whose "natural" sort is descending (e.g. score), asc and desc
  // share the same field, so derive the reverse from the current value.
  if (desc === asc) {
    return currentSort === asc
      ? (`${field}-asc` as SortOption)
      : asc;
  }
  return currentSort === asc ? desc : asc;
}

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
  readonly ads?: AdsFilter;
  readonly q: string;
  readonly sort: SortOption;
  readonly techStack?: TechStackFilter;
  readonly copyrightFrom?: number;
  readonly copyrightTo?: number;
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
    if (filters.ads === 'with' && lead.hasAds !== true) {
      return false;
    }
    if (filters.ads === 'without' && lead.hasAds === true) {
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
    const techStack = filters.techStack ?? [];
    if (techStack.length > 0) {
      const leadTechs = (lead.techStack ?? []).map((t) => t.toLowerCase());
      const match = techStack.some((t) =>
        leadTechs.some((lt) => lt.includes(t.toLowerCase()))
      );
      if (!match) return false;
    }
    if (!leadMatchesYearRange(lead, filters.copyrightFrom, filters.copyrightTo)) {
      return false;
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
      case 'city-asc':
      case 'city-desc': {
        // Empty cities always sort to the end, regardless of direction.
        const aHas = !!(a.lead.city ?? '');
        const bHas = !!(b.lead.city ?? '');
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (!aHas) return 0;
        return sort === 'city-asc'
          ? a.lead.city!.localeCompare(b.lead.city!)
          : b.lead.city!.localeCompare(a.lead.city!);
      }
      case 'score-asc':
      case 'score-desc': {
        const aHas = a.score !== undefined;
        const bHas = b.score !== undefined;
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (!aHas) return 0;
        return sort === 'score-asc'
          ? a.score! - b.score!
          : b.score! - a.score!;
      }
      case 'status-asc':
        return a.lead.status.localeCompare(b.lead.status);
      case 'status-desc':
        return b.lead.status.localeCompare(a.lead.status);
    }
  });
  return sorted;
}
