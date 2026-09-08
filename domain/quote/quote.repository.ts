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
  /**
   * Next available sequence for the PREV-YYYY-NNN numbering: the largest NNN
   * already issued in the given calendar year plus one (1 if none). Max-based
   * rather than count-based so that deleting a quote never reuses a number.
   */
  nextSequenceForYear(year: number): Promise<number>;
}
