import { prisma } from '@/infrastructure/db/prisma';
import type { QuotaStore } from '@/infrastructure/shared/quota-store';

/**
 * Postgres-backed quota counters (table `api_quota_counters`).
 *
 * This is the only implementation safe on serverless: the counter lives in the
 * database every instance already shares, instead of a per-instance file on an
 * ephemeral (and read-only outside /tmp) filesystem.
 */
export class PrismaQuotaStore implements QuotaStore {
  async read(bucket: string, date: string): Promise<number> {
    const row = await prisma.apiQuotaCounter.findUnique({
      where: { bucket_date: { bucket, date } },
      select: { used: true },
    });

    return row?.used ?? 0;
  }

  /**
   * Atomic thanks to the (bucket, date) primary key: the upsert compiles to a
   * single `INSERT ... ON CONFLICT DO UPDATE SET used = used + 1 RETURNING`,
   * so concurrent invocations serialize on the row and no call is lost.
   */
  async increment(bucket: string, date: string): Promise<number> {
    const row = await prisma.apiQuotaCounter.upsert({
      where: { bucket_date: { bucket, date } },
      create: { bucket, date, used: 1 },
      update: { used: { increment: 1 } },
      select: { used: true },
    });

    return row.used;
  }

  async reset(date: string, bucket?: string): Promise<void> {
    await prisma.apiQuotaCounter.deleteMany({
      where: bucket ? { bucket, date } : { date },
    });
  }
}
