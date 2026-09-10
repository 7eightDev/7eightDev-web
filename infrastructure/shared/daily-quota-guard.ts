import { createLogger } from '@/infrastructure/logging/logger';
import type { QuotaStore } from '@/infrastructure/shared/quota-store';

const log = createLogger('quota-guard');

/** Well-known quota buckets, one per billed Google SKU. */
export const QUOTA_BUCKET_PLACES_TEXT_SEARCH = 'places-text-search';
export const QUOTA_BUCKET_PLACES_AUTOCOMPLETE = 'places-autocomplete';

/**
 * Default daily limits derived from Google's per-SKU free monthly thresholds
 * (see AGENTS.md). Rounded DOWN using 31 days so the monthly free allowance is
 * never exceeded even in 31-day months:
 *   - Text Search Enterprise (website + phone in field mask): 1000 free/mo -> 32/day
 *   - Autocomplete (Essentials): 10000 free/mo -> 322/day
 * PageSpeed Insights is free (no billed SKU) and is NOT counted here.
 */
const DEFAULT_DAILY_LIMITS: Record<string, number> = {
  [QUOTA_BUCKET_PLACES_TEXT_SEARCH]: 32,
  [QUOTA_BUCKET_PLACES_AUTOCOMPLETE]: 322,
};

/**
 * Resolves the configured daily limit for a bucket from the environment:
 *   GOOGLE_PLACES_DAILY_QUOTA_LIMIT       -> places-text-search
 *   GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT -> places-autocomplete
 */
function resolveDailyLimit(bucket: string): number {
  switch (bucket) {
    case QUOTA_BUCKET_PLACES_TEXT_SEARCH:
      return Number(process.env.GOOGLE_PLACES_DAILY_QUOTA_LIMIT) ||
        DEFAULT_DAILY_LIMITS[bucket];
    case QUOTA_BUCKET_PLACES_AUTOCOMPLETE:
      return Number(process.env.GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT) ||
        DEFAULT_DAILY_LIMITS[bucket];
    default:
      return DEFAULT_DAILY_LIMITS[bucket] ?? Number.POSITIVE_INFINITY;
  }
}

export interface DailyQuotaGuardConfig {
  /** Overrides for daily limits keyed by bucket (mainly for tests). */
  readonly limits?: Record<string, number>;
  /**
   * Counter persistence. Required and injected by the composition root
   * (PrismaQuotaStore in production, InMemoryQuotaStore in tests) so this
   * module never depends on Prisma.
   */
  readonly store: QuotaStore;
}

export interface QuotaCheckResult {
  readonly allowed: boolean;
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
}

export interface QuotaUsage {
  readonly used: number;
  readonly limit: number;
  readonly date: string;
}

/**
 * Daily quota guard for billed Google API calls.
 *
 * Counts calls per bucket (one bucket = one Google SKU) against a daily limit
 * derived from Google's monthly free threshold, so the account never exceeds
 * the free allowance and never gets a surprise bill. Counters are keyed by
 * (bucket, UTC day) in the shared store, so a new day starts from zero without
 * any explicit reset.
 *
 * State lives in Postgres via QuotaStore: the previous JSON-file tracker could
 * not work on serverless, where the filesystem is per-instance and read-only
 * outside /tmp — every write failed and the counter restarted from zero on each
 * invocation, leaving the guard effectively disabled in production.
 *
 * FAIL-CLOSED: when the store is unreachable the guard denies the call. For a
 * cost control, blocking a feature is preferable to an uncounted billed call.
 *
 * Configure the limits via GOOGLE_PLACES_DAILY_QUOTA_LIMIT and
 * GOOGLE_AUTOCOMPLETE_DAILY_QUOTA_LIMIT.
 */
export class DailyQuotaGuard {
  private readonly store: QuotaStore;
  private readonly limits: Record<string, number>;

  constructor(config: DailyQuotaGuardConfig) {
    this.store = config.store;
    const envLimits: Record<string, number> = {
      [QUOTA_BUCKET_PLACES_TEXT_SEARCH]: resolveDailyLimit(
        QUOTA_BUCKET_PLACES_TEXT_SEARCH
      ),
      [QUOTA_BUCKET_PLACES_AUTOCOMPLETE]: resolveDailyLimit(
        QUOTA_BUCKET_PLACES_AUTOCOMPLETE
      ),
    };
    this.limits = {
      ...DEFAULT_DAILY_LIMITS,
      ...envLimits,
      ...(config.limits ?? {}),
    };
  }

  /**
   * Check whether a call for the given bucket is still allowed, WITHOUT
   * consuming a unit. Returns usage details (used/limit/remaining).
   * Logs a warning when blocked.
   *
   * Use together with `increment()`: call `check()` before issuing the API
   * request, and `increment()` after it actually succeeded, so failed calls
   * (transport errors, HTTP errors, quota rejects) never count against the
   * daily free allowance.
   */
  async check(bucket: string): Promise<QuotaCheckResult> {
    const limit = this.limits[bucket];
    const date = this.today();

    let used: number;
    try {
      used = await this.store.read(bucket, date);
    } catch (error) {
      // Unknown usage: assume exhausted rather than risk a billed call.
      log.error('Lettura quota fallita – chiamate API bloccate', {
        bucket,
        error: String(error),
      });
      return { allowed: false, used: limit, limit, remaining: 0 };
    }

    if (used >= limit) {
      log.warn('QUOTA RAGGIUNTA – chiamate API bloccate', {
        bucket,
        used,
        limit,
        date,
      });
    }

    return {
      allowed: used < limit,
      used,
      limit,
      remaining: Math.max(limit - used, 0),
    };
  }

  /**
   * Record one served API call for the given bucket. Call ONLY after the
   * request really reached the provider and returned a usable response:
   * a failed call must never be counted.
   */
  async increment(bucket: string): Promise<QuotaCheckResult> {
    const limit = this.limits[bucket];

    let used: number;
    try {
      used = await this.store.increment(bucket, this.today());
    } catch (error) {
      // The call already happened but could not be counted: report the bucket
      // as exhausted so the next check() blocks instead of overshooting.
      log.error('Impossibile registrare la chiamata API sul contatore quota', {
        bucket,
        error: String(error),
      });
      return { allowed: false, used: limit, limit, remaining: 0 };
    }

    const remaining = Math.max(limit - used, 0);

    if (remaining <= 10) {
      log.warn('Quasi al limite giornaliero API', {
        bucket,
        used,
        limit,
        remaining,
      });
    } else {
      log.debug('Chiamata API registrata', {
        bucket,
        used,
        limit,
        remaining,
      });
    }

    return {
      allowed: used <= limit,
      used,
      limit,
      remaining,
    };
  }

  /**
   * Combined check + increment: returns whether a call is allowed and, if so,
   * consumes one unit immediately. Legacy helper kept for tests/backwards
   * compatibility — production callers should use `check()` + `increment()`
   * so failed calls are not counted.
   */
  async checkAndIncrement(bucket: string): Promise<QuotaCheckResult> {
    const checked = await this.check(bucket);
    if (!checked.allowed) return checked;
    return this.increment(bucket);
  }

  /** Returns the current daily limit for a bucket. */
  limitFor(bucket: string): number {
    return this.limits[bucket];
  }

  /**
   * Read-only usage for a bucket, for the admin badge and debugging.
   * Reports the bucket as exhausted when the store is unreachable, matching
   * the fail-closed behaviour of `check()`.
   */
  async usage(bucket: string): Promise<QuotaUsage> {
    const limit = this.limits[bucket];
    const date = this.today();

    try {
      return { used: await this.store.read(bucket, date), limit, date };
    } catch (error) {
      log.error('Lettura quota fallita', { bucket, error: String(error) });
      return { used: limit, limit, date };
    }
  }

  /**
   * Reset today's counter for one bucket, or for all buckets when none is
   * given (for testing).
   */
  async reset(bucket?: string): Promise<void> {
    await this.store.reset(this.today(), bucket);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
