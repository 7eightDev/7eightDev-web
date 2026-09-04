import { RateLimiter } from '@/infrastructure/shared/rate-limiter';

describe('RateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(true);
  });

  it('rejects requests over the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(false);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 1 });
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(false);
    expect(limiter.allow('user-2')).toBe(true);
  });

  it('resets after the window expires', () => {
    const limiter = new RateLimiter({ windowMs: 100, maxRequests: 1 });
    expect(limiter.allow('user-1')).toBe(true);
    expect(limiter.allow('user-1')).toBe(false);

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(limiter.allow('user-1')).toBe(true);
        resolve();
      }, 150);
    });
  });

  it('clears all entries', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 1 });
    limiter.allow('user-1');
    expect(limiter.size).toBe(1);
    limiter.clear();
    expect(limiter.size).toBe(0);
  });
});
