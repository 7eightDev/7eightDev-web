import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { prisma } from "@/infrastructure/db/prisma";
import {
  type QuoteRow,
  quoteToRow,
  rowToQuote,
} from "@/infrastructure/quote/quote.mapper";

/** Adapter: Postgres implementation of the QuoteRepository port. */
export class PrismaQuoteRepository implements QuoteRepository {
  async findById(id: string): Promise<Quote | null> {
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
      vatRate: row.vatRate,
      lineItems: row.lineItems as object,
      metadata: row.metadata as object,
      acceptance: (row.acceptance as object | null) ?? undefined,
    };
    await prisma.quote.upsert({
      where: { id: row.id },
      create: { id: row.id, ...data },
      update: data,
    });
  }

  async countByYear(year: number): Promise<number> {
    return prisma.quote.count({
      where: {
        issuedAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
    });
  }
}
