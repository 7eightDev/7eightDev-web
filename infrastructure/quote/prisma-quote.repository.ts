import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { QuoteNumberConflictError } from "@/domain/quote/quote.errors";
import { prisma } from "@/infrastructure/db/prisma";
import {
  type QuoteRow,
  quoteToRow,
  rowToQuote,
} from "@/infrastructure/quote/quote.mapper";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a Prisma P2002 violation targets the `number` unique column. */
function isUniqueOnNumber(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const prismaError = error as {
    code?: string;
    meta?: { target?: unknown };
  };
  if (prismaError.code !== "P2002") return false;
  const target = prismaError.meta?.target;
  return Array.isArray(target) && target.includes("number");
}

/** Adapter: Postgres implementation of the QuoteRepository port. */
export class PrismaQuoteRepository implements QuoteRepository {
  async findById(id: string): Promise<Quote | null> {
    // The id column is a Postgres UUID: a malformed input would make the
    // query itself fail (P2023). Treat invalid ids as "not found".
    if (!UUID_PATTERN.test(id)) return null;
    const row = await prisma.quote.findUnique({ where: { id } });
    return row ? rowToQuote(row as unknown as QuoteRow) : null;
  }

  async findAll(): Promise<Quote[]> {
    const rows = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => rowToQuote(row as unknown as QuoteRow));
  }

  async save(quote: Quote): Promise<void> {
    const row = quoteToRow(quote);
    const data = {
      number: row.number,
      status: row.status,
      client: row.client as object,
      project: row.project,
      intro: row.intro,
      issuedAt: row.issuedAt,
      validUntil: row.validUntil,
      fiscalRegime: row.fiscalRegime,
      vatRate: row.vatRate,
      lineItems: row.lineItems as object,
      metadata: row.metadata as object,
      acceptance: (row.acceptance as object | null) ?? undefined,
      archivedAt: row.archivedAt,
    };
    await prisma.quote.upsert({
      where: { id: row.id },
      create: { id: row.id, ...data },
      update: data,
    }).catch((error: unknown) => {
      // A P2002 on `number` means another row already owns the sequence that
      // count-based generation could have reused. Surface it as a domain error
      // so the create use case can pick a fresh number and retry.
      if (isUniqueOnNumber(error)) throw new QuoteNumberConflictError();
      throw error;
    });
  }

  async delete(id: string): Promise<void> {
    // A malformed UUID can match no row; deleting an absent id is also a no-op
    // for callers, so swallow Prisma's "record not found" (P2025).
    if (!UUID_PATTERN.test(id)) return;
    try {
      await prisma.quote.delete({ where: { id } });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        return;
      }
      throw error;
    }
  }

  async nextSequenceForYear(year: number): Promise<number> {
    const rows = await prisma.quote.findMany({
      where: {
        issuedAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { number: true },
    });

    const prefix = new RegExp(`^PREV-${year}-(\\d{3})$`);
    let max = 0;
    for (const { number } of rows) {
      const match = prefix.exec(number);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return max + 1;
  }
}
