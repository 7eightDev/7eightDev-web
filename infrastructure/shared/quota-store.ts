/**
 * Storage seam for the DailyQuotaGuard counters.
 *
 * Kept in `infrastructure/` rather than `domain/`: the quota guard is a cost
 * control over billed third-party APIs, never a business rule — no domain or
 * application code depends on it.
 *
 * Counters are keyed by (bucket, day): the "daily reset" is not a mutation but
 * simply a different key, so no scheduled cleanup is needed and concurrent
 * readers can never observe a half-reset state.
 */
export interface QuotaStore {
  /** Calls already recorded for the bucket on that day (0 when unknown). */
  read(bucket: string, date: string): Promise<number>;

  /**
   * Record one call and return the resulting total. MUST be atomic: on
   * serverless, several instances increment the same bucket concurrently and a
   * read-modify-write would silently lose calls — exactly the undercount that
   * lets the free allowance be exceeded.
   */
  increment(bucket: string, date: string): Promise<number>;

  /** Zero one bucket for that day, or every bucket when none is given. */
  reset(date: string, bucket?: string): Promise<void>;
}

/**
 * Process-local store, for tests and for running without a database.
 * Not shared across instances: never use it in production.
 */
export class InMemoryQuotaStore implements QuotaStore {
  private readonly counters = new Map<string, number>();

  private key(bucket: string, date: string): string {
    return `${date}::${bucket}`;
  }

  async read(bucket: string, date: string): Promise<number> {
    return this.counters.get(this.key(bucket, date)) ?? 0;
  }

  async increment(bucket: string, date: string): Promise<number> {
    const next = (this.counters.get(this.key(bucket, date)) ?? 0) + 1;
    this.counters.set(this.key(bucket, date), next);
    return next;
  }

  async reset(date: string, bucket?: string): Promise<void> {
    if (bucket) {
      this.counters.delete(this.key(bucket, date));
      return;
    }

    for (const key of this.counters.keys()) {
      if (key.startsWith(`${date}::`)) this.counters.delete(key);
    }
  }
}
