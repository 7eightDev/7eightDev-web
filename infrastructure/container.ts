import type { QuoteRepository } from "@/domain/quote/quote.repository";
import { PrismaQuoteRepository } from "@/infrastructure/quote/prisma-quote.repository";

/**
 * Composition root: single place where ports are bound to adapters.
 * Swap implementations here (e.g. in-memory for local demos without DB).
 */
export const quoteRepository: QuoteRepository = new PrismaQuoteRepository();
