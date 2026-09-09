import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createLogger } from '@/infrastructure/logging/logger';

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
  readonly trackerFilePath: string;
}

interface TrackerState {
  readonly date: string;
  readonly buckets: Record<string, number>;
}

export interface QuotaCheckResult {
  readonly allowed: boolean;
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
}

/**
 * Daily quota guard for billed Google API calls.
 *
 * Persists a per-bucket call counter to a local JSON file and resets all
 * buckets automatically when the calendar day changes. Each bucket maps to a
 * Google SKU and is capped at a daily limit derived from Google's monthly free
 * threshold, so the account never exceeds the free allowance and never gets a
 * surprise bill.
 *
 * Configure via env vars (limits) and GOOGLE_API_QUOTA_TRACKER_PATH (file path).
 */
export class DailyQuotaGuard {
  private readonly trackerFilePath: string;
  private readonly limits: Record<string, number>;
  private state: TrackerState;

  constructor(config?: Partial<DailyQuotaGuardConfig>) {
    this.trackerFilePath =
      config?.trackerFilePath ??
      process.env.GOOGLE_API_QUOTA_TRACKER_PATH ??
      './api_usage_tracker.json';
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
      ...(config?.limits ?? {}),
    };
    this.state = this.loadState();
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
    this.state = this.loadState();
    const used = this.state.buckets[bucket] ?? 0;
    const limit = this.limits[bucket];

    if (used >= limit) {
      log.warn('QUOTA RAGGIUNTA – chiamate API bloccate', {
        bucket,
        used,
        limit,
        date: this.state.date,
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
    this.state = this.loadState();
    const used = this.state.buckets[bucket] ?? 0;
    const limit = this.limits[bucket];
    const newUsed = used + 1;

    this.state = {
      ...this.state,
      buckets: { ...this.state.buckets, [bucket]: newUsed },
    };
    this.saveState(this.state);

    const remaining = Math.max(limit - newUsed, 0);

    if (remaining <= 10) {
      log.warn('Quasi al limite giornaliero API', {
        bucket,
        used: newUsed,
        limit,
        remaining,
      });
    } else {
      log.debug('Chiamata API registrata', {
        bucket,
        used: newUsed,
        limit,
        remaining,
      });
    }

    return {
      allowed: newUsed <= limit,
      used: newUsed,
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

  /** Read-only access to current usage for a bucket (for testing/debugging). */
  usage(bucket: string): { used: number; limit: number; date: string } {
    const state = this.loadState();
    return {
      used: state.buckets[bucket] ?? 0,
      limit: this.limits[bucket],
      date: state.date,
    };
  }

  /**
   * Reset the counter for one bucket, or all buckets when none is given
   * (for testing).
   */
  reset(bucket?: string): void {
    const state = this.loadState();
    const buckets = bucket
      ? { ...state.buckets, [bucket]: 0 }
      : {};
    this.saveState({ date: this.today(), buckets });
  }

  private loadState(): TrackerState {
    try {
      const raw = readFileSync(this.trackerFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as TrackerState;

      if (parsed.date === this.today()) {
        return { date: parsed.date, buckets: parsed.buckets ?? {} };
      }

      // New day — reset all buckets
      log.info('Nuovo giorno: counter quota resettato', {
        previousDate: parsed.date,
      });
      return { date: this.today(), buckets: {} };
    } catch {
      // File doesn't exist or is corrupt — start fresh
      return { date: this.today(), buckets: {} };
    }
  }

  private saveState(state: TrackerState): void {
    try {
      const dir = dirname(this.trackerFilePath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        this.trackerFilePath,
        JSON.stringify(state, null, 2),
        'utf-8'
      );
    } catch (error) {
      log.error('Impossibile salvare il tracker quota', {
        error: String(error),
      });
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}