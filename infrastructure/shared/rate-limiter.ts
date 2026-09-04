interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

export interface RateLimiterConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}

/**
 * In-memory sliding window rate limiter.
 * Per-instance only (not shared across Vercel serverless instances).
 * Sufficient for basic B2B admin protection.
 */
export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
  }

  /**
   * Returns true if the request is allowed, false if rate limited.
   * Automatically cleans up expired entries on each call.
   */
  allow(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    this.store.set(key, { count: entry.count + 1, resetAt: entry.resetAt });
    return true;
  }

  /** Returns the number of active entries (for testing/debugging). */
  get size(): number {
    return this.store.size;
  }

  /** Clears all entries (for testing). */
  clear(): void {
    this.store.clear();
  }
}
