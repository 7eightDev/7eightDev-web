import type { Quote } from '@/domain/quote/quote.types';

/**
 * Pure, framework-agnostic filtering for the quotes list view.
 *
 * Kept separate from the UI so the rules are unit-testable and so new filter
 * dimensions can be added without touching React. Status and due-date are
 * orthogonal: a quote can be `sent` *and* past its `validUntil` — the two
 * predicates compose. Filtering runs against the read model (an array of
 * Quotes); when the dataset grows this same shape can be pushed down into the
 * repository as a query without changing the option contracts below.
 */

/* ----------------------------- Status ----------------------------- */

/**
 * Status filter options, mirroring the full domain lifecycle now that every
 * status is reachable: draft → sent → {accepted, rejected, expired}. The
 * reject/expire use cases set the two closed-negative states; date-based expiry
 * remains available separately via the due-date filter.
 */
export const STATUS_FILTER_VALUES = [
  'all',
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
] as const;

export type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

export const DEFAULT_STATUS_FILTER: StatusFilter = 'all';

/** Narrow an arbitrary query-param string to a known status filter. */
export function parseStatusFilter(raw: string | undefined): StatusFilter {
  return STATUS_FILTER_VALUES.includes(raw as StatusFilter)
    ? (raw as StatusFilter)
    : DEFAULT_STATUS_FILTER;
}

/* --------------------------- Due date ----------------------------- */

/**
 * A quote whose `validUntil` falls within this many days from "today"
 * (inclusive) is considered "expiring". Single source of truth so the label
 * and the predicate can never drift.
 */
export const EXPIRING_WITHIN_DAYS = 7;

export const DUE_FILTER_VALUES = [
  'all',
  'valid',
  'expiring',
  'expired',
] as const;

export type DueFilter = (typeof DUE_FILTER_VALUES)[number];

/** The concrete buckets a quote can fall into (excludes the "all" sentinel). */
export type DueBucket = Exclude<DueFilter, 'all'>;

export const DEFAULT_DUE_FILTER: DueFilter = 'all';

/** Narrow an arbitrary query-param string to a known due filter. */
export function parseDueFilter(raw: string | undefined): DueFilter {
  return DUE_FILTER_VALUES.includes(raw as DueFilter)
    ? (raw as DueFilter)
    : DEFAULT_DUE_FILTER;
}

/** Midnight (UTC) of the given instant, matching formatDateIt's UTC basis. */
function startOfUtcDay(instant: Date): number {
  return Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate()
  );
}

/**
 * Classify a quote's validity by date alone (independent of its status).
 * Comparison is day-granular in UTC, so "expires today" counts as expiring,
 * not expired, regardless of the time component.
 */
export function dueBucket(validUntilIso: string, now: Date = new Date()): DueBucket {
  const today = startOfUtcDay(now);
  const validUntil = startOfUtcDay(new Date(validUntilIso));
  const dayMs = 86_400_000;
  const daysLeft = Math.round((validUntil - today) / dayMs);

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= EXPIRING_WITHIN_DAYS) return 'expiring';
  return 'valid';
}

/* --------------------------- Archived ----------------------------- */

/**
 * Archiving is orthogonal to the status lifecycle, so it is its own filter
 * dimension rather than a status value. The default list shows active quotes
 * only; the `?archived=1` view shows archived quotes only. Within either view
 * the status and due-date filters still compose.
 */
export function parseArchivedFilter(raw: string | undefined): boolean {
  return raw === '1';
}

/* --------------------------- Composition -------------------------- */

export interface QuoteFilters {
  readonly status: StatusFilter;
  readonly due: DueFilter;
  /** false = active quotes only (default); true = archived quotes only. */
  readonly archived: boolean;
}

/**
 * Apply the active status and due-date filters to a list of quotes.
 * Order is preserved; "all" on a dimension is a no-op for that dimension.
 */
export function filterQuotes(
  quotes: readonly Quote[],
  filters: QuoteFilters,
  now: Date = new Date()
): Quote[] {
  return quotes.filter((quote) => {
    // Archived state is the first gate: the two views never overlap.
    if (Boolean(quote.archivedAt) !== filters.archived) {
      return false;
    }
    if (filters.status !== 'all' && quote.status !== filters.status) {
      return false;
    }
    if (filters.due !== 'all' && dueBucket(quote.validUntil, now) !== filters.due) {
      return false;
    }
    return true;
  });
}

/* ------------------------------ Labels ---------------------------- */

/**
 * Italian labels for the filter chips. Status labels mirror the list page's
 * STATUS_LABEL plus the "all" sentinel; co-located here so options and parsing
 * share one source of truth.
 */
export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'tutti',
  draft: 'bozza',
  sent: 'inviato',
  accepted: 'accettato',
  rejected: 'rifiutato',
  expired: 'scaduto',
};

export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  all: 'tutte',
  valid: 'valide',
  expiring: 'in scadenza',
  expired: 'scadute',
};
