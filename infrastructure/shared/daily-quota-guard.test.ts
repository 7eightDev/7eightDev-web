import {
  DailyQuotaGuard,
  QUOTA_BUCKET_PLACES_TEXT_SEARCH,
} from '@/infrastructure/shared/daily-quota-guard';
import {
  InMemoryQuotaStore,
  type QuotaStore,
} from '@/infrastructure/shared/quota-store';

describe('DailyQuotaGuard', () => {
  const bucket = QUOTA_BUCKET_PLACES_TEXT_SEARCH;
  let store: InMemoryQuotaStore;

  beforeEach(() => {
    store = new InMemoryQuotaStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function guardWith(limits: Record<string, number>, custom?: QuotaStore) {
    return new DailyQuotaGuard({ limits, store: custom ?? store });
  }

  it('allows calls within the daily limit', async () => {
    const guard = guardWith({ [bucket]: 3 });

    const r1 = await guard.checkAndIncrement(bucket);
    expect(r1.allowed).toBe(true);
    expect(r1.used).toBe(1);
    expect(r1.remaining).toBe(2);

    const r2 = await guard.checkAndIncrement(bucket);
    expect(r2.allowed).toBe(true);
    expect(r2.used).toBe(2);
    expect(r2.remaining).toBe(1);
  });

  it('check() does not consume quota', async () => {
    const guard = guardWith({ [bucket]: 3 });

    const r = await guard.check(bucket);

    expect(r.allowed).toBe(true);
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(3);
    expect((await guard.usage(bucket)).used).toBe(0);
  });

  it('increment() counts only explicitly recorded calls', async () => {
    const guard = guardWith({ [bucket]: 2 });

    const first = await guard.increment(bucket);
    expect(first.allowed).toBe(true);
    expect((await guard.usage(bucket)).used).toBe(1);

    const second = await guard.check(bucket);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);

    await guard.increment(bucket);
    await expect(guard.check(bucket)).resolves.toMatchObject({
      allowed: false,
    });
  });

  it('rejects calls when the daily limit is reached', async () => {
    const guard = guardWith({ [bucket]: 2 });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);

    const r = await guard.checkAndIncrement(bucket);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(2);
    expect(r.remaining).toBe(0);
  });

  it('tracks different buckets independently', async () => {
    const guard = guardWith({ [bucket]: 1, 'places-autocomplete': 5 });

    const first = await guard.checkAndIncrement(bucket);
    expect(first.allowed).toBe(true);
    expect(await guard.checkAndIncrement(bucket)).toMatchObject({
      allowed: false,
    });

    const autocomplete = await guard.checkAndIncrement('places-autocomplete');
    expect(autocomplete.allowed).toBe(true);
    expect(autocomplete.used).toBe(1);
  });

  // The reason this feature exists: on serverless every request may be served
  // by a different instance, so two guards over one store must share a counter.
  it('shares the counter across guard instances backed by the same store', async () => {
    const instanceA = guardWith({ [bucket]: 3 });
    const instanceB = guardWith({ [bucket]: 3 });

    await instanceA.checkAndIncrement(bucket);
    await instanceA.checkAndIncrement(bucket);

    expect((await instanceB.usage(bucket)).used).toBe(2);

    const third = await instanceB.checkAndIncrement(bucket);
    expect(third.used).toBe(3);
    await expect(instanceA.check(bucket)).resolves.toMatchObject({
      allowed: false,
    });
  });

  it('does not lose concurrent increments', async () => {
    const guard = guardWith({ [bucket]: 50 });

    await Promise.all(
      Array.from({ length: 20 }, () => guard.increment(bucket))
    );

    expect((await guard.usage(bucket)).used).toBe(20);
  });

  it('resets all buckets on a new day', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-09T10:00:00.000Z'));

    const guard = guardWith({ [bucket]: 100, 'places-autocomplete': 100 });
    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement('places-autocomplete');
    expect((await guard.usage(bucket)).used).toBe(1);

    jest.setSystemTime(new Date('2026-09-10T10:00:00.000Z'));

    const r = await guard.checkAndIncrement(bucket);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
    expect((await guard.usage('places-autocomplete')).used).toBe(0);
  });

  it('starts fresh when the store has no counter yet', async () => {
    const guard = guardWith({ [bucket]: 5 });

    const r = await guard.checkAndIncrement(bucket);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
  });

  it('reset() zeroes a single bucket only', async () => {
    const guard = guardWith({ [bucket]: 5, 'places-autocomplete': 5 });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement('places-autocomplete');
    await guard.reset(bucket);

    const r = await guard.checkAndIncrement(bucket);
    expect(r.used).toBe(1);
    expect((await guard.usage('places-autocomplete')).used).toBe(1);
  });

  it('usage returns current state', async () => {
    const guard = guardWith({ [bucket]: 10 });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);

    const usage = await guard.usage(bucket);
    expect(usage.used).toBe(2);
    expect(usage.limit).toBe(10);
    expect(usage.date).toBe(new Date().toISOString().slice(0, 10));
  });

  describe('when the store is unreachable', () => {
    const unreachable: QuotaStore = {
      read: async () => {
        throw new Error('connection refused');
      },
      increment: async () => {
        throw new Error('connection refused');
      },
      reset: async () => {
        throw new Error('connection refused');
      },
    };

    // Fail-closed: an uncounted billed call is worse than a blocked feature.
    it('check() denies the call instead of assuming zero usage', async () => {
      const guard = guardWith({ [bucket]: 10 }, unreachable);

      const r = await guard.check(bucket);

      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
      expect(r.used).toBe(10);
    });

    it('increment() reports the bucket as exhausted without throwing', async () => {
      const guard = guardWith({ [bucket]: 10 }, unreachable);

      const r = await guard.increment(bucket);

      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
    });

    it('usage() reports the bucket as exhausted', async () => {
      const guard = guardWith({ [bucket]: 10 }, unreachable);

      expect(await guard.usage(bucket)).toMatchObject({ used: 10, limit: 10 });
    });
  });
});
