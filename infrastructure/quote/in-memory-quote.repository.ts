import type { QuoteRepository } from "@/domain/quote/quote.repository";
import type { Quote } from "@/domain/quote/quote.types";
import { AVIS_QUOTE } from "@/infrastructure/quote/quote.seed";

/**
 * Adapter: in-memory QuoteRepository.
 * Placeholder until the Postgres adapter lands — state does not survive
 * server restarts. Module-level singleton so server actions and pages
 * share the same store within a server instance.
 */
class InMemoryQuoteRepository implements QuoteRepository {
  private readonly store = new Map<string, Quote>();

  constructor(seed: readonly Quote[] = []) {
    for (const quote of seed) this.store.set(quote.id, quote);
  }

  async findById(id: string): Promise<Quote | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Quote[]> {
    return [...this.store.values()];
  }

  async save(quote: Quote): Promise<void> {
    this.store.set(quote.id, quote);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async nextSequenceForYear(year: number): Promise<number> {
    const prefix = new RegExp(`^PREV-${year}-(\\d{3})$`);
    let max = 0;
    for (const quote of this.store.values()) {
      const match = prefix.exec(quote.number);
      if (new Date(quote.issuedAt).getUTCFullYear() === year && match) {
        max = Math.max(max, Number(match[1]));
      }
    }
    return max + 1;
  }
}

export const inMemoryQuoteRepository: QuoteRepository =
  new InMemoryQuoteRepository([AVIS_QUOTE]);
