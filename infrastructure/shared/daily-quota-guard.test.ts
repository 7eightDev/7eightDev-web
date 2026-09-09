import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DailyQuotaGuard,
  QUOTA_BUCKET_PLACES_TEXT_SEARCH,
} from '@/infrastructure/shared/daily-quota-guard';

describe('DailyQuotaGuard', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'quota-guard-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const bucket = QUOTA_BUCKET_PLACES_TEXT_SEARCH;

  function trackerPath() {
    return join(tmpDir, 'tracker.json');
  }

  it('allows calls within the daily limit', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 3 },
      trackerFilePath: trackerPath(),
    });

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
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 3 },
      trackerFilePath: trackerPath(),
    });

    const r = await guard.check(bucket);

    expect(r.allowed).toBe(true);
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(3);
    expect(guard.usage(bucket).used).toBe(0);
  });

  it('increment() counts only explicitly recorded calls', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 2 },
      trackerFilePath: trackerPath(),
    });

    const first = await guard.increment(bucket);
    expect(first.allowed).toBe(true);
    expect(guard.usage(bucket).used).toBe(1);

    const second = await guard.check(bucket);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);

    await guard.increment(bucket);
    expect(guard.check(bucket)).resolves.toMatchObject({ allowed: false });
  });

  it('rejects calls when the daily limit is reached', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 2 },
      trackerFilePath: trackerPath(),
    });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);

    const r = await guard.checkAndIncrement(bucket);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(2);
    expect(r.remaining).toBe(0);
  });

  it('tracks different buckets independently', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 1, 'places-autocomplete': 5 },
      trackerFilePath: trackerPath(),
    });

    const first = await guard.checkAndIncrement(bucket);
    expect(first.allowed).toBe(true);
    expect(await guard.checkAndIncrement(bucket)).toMatchObject({
      allowed: false,
    });

    const autocomplete = await guard.checkAndIncrement('places-autocomplete');
    expect(autocomplete.allowed).toBe(true);
    expect(autocomplete.used).toBe(1);
  });

  it('persists state to the tracker file', async () => {
    const path = trackerPath();
    const guard = new DailyQuotaGuard({ limits: { [bucket]: 10 }, trackerFilePath: path });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);

    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    expect(raw.buckets[bucket]).toBe(2);
    expect(raw.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('resets all buckets on a new day', async () => {
    const path = trackerPath();

    // Simulate yesterday's usage
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(
      path,
      JSON.stringify({
        date: yesterdayStr,
        buckets: { [bucket]: 50, 'places-autocomplete': 100 },
      })
    );

    const guard = new DailyQuotaGuard({ limits: { [bucket]: 100 }, trackerFilePath: path });
    const r = await guard.checkAndIncrement(bucket);

    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
    expect(guard.usage('places-autocomplete').used).toBe(0);
  });

  it('starts fresh when tracker file does not exist', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 5 },
      trackerFilePath: join(tmpDir, 'nonexistent.json'),
    });

    const r = await guard.checkAndIncrement(bucket);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
  });

  it('reset() zeroes a single bucket only', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 5, 'places-autocomplete': 5 },
      trackerFilePath: trackerPath(),
    });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement('places-autocomplete');
    guard.reset(bucket);

    const r = await guard.checkAndIncrement(bucket);
    expect(r.used).toBe(1);
    expect(guard.usage('places-autocomplete').used).toBe(1);
  });

  it('usage returns current state', async () => {
    const guard = new DailyQuotaGuard({
      limits: { [bucket]: 10 },
      trackerFilePath: trackerPath(),
    });

    await guard.checkAndIncrement(bucket);
    await guard.checkAndIncrement(bucket);

    expect(guard.usage(bucket).used).toBe(2);
    expect(guard.usage(bucket).limit).toBe(10);
    expect(guard.usage(bucket).date).toBe(new Date().toISOString().slice(0, 10));
  });
});