import type { Quote } from "@/domain/quote/quote.types";

/**
 * Port: persistence contract for the Quote aggregate.
 * Implementations live in infrastructure/ (in-memory now, Postgres later).
 */
export interface QuoteRepository {
  findById(id: string): Promise<Quote | null>;
  findAll(): Promise<Quote[]>;
  save(quote: Quote): Promise<void>;
  /** Permanently remove a quote. No-op if it does not exist. */
  delete(id: string): Promise<void>;
  /** Number of quotes issued in a calendar year (for PREV-YYYY-NNN numbering). */
  countByYear(year: number): Promise<number>;
}
