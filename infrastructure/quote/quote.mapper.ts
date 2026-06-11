import type {
  AcceptanceRecord,
  ClientInfo,
  LineItem,
  Quote,
  QuoteMetadata,
  QuoteStatus,
} from "@/domain/quote/quote.types";

/**
 * Structural row type matching the `quotes` table.
 * Declared structurally (not imported from the generated client) so the
 * mapper stays unit-testable without codegen and independent of Prisma.
 */
export interface QuoteRow {
  id: string;
  number: string;
  status: QuoteStatus;
  client: unknown;
  project: string;
  intro: string;
  issuedAt: Date;
  validUntil: Date;
  vatRate: number;
  lineItems: unknown;
  metadata: unknown;
  acceptance: unknown | null;
}

export function rowToQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    client: row.client as ClientInfo,
    project: row.project,
    intro: row.intro,
    issuedAt: row.issuedAt.toISOString(),
    validUntil: row.validUntil.toISOString(),
    vatRate: row.vatRate,
    lineItems: row.lineItems as LineItem[],
    metadata: (row.metadata ?? {}) as QuoteMetadata,
    acceptance: (row.acceptance as AcceptanceRecord | null) ?? undefined,
  };
}

export function quoteToRow(quote: Quote): QuoteRow {
  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    client: quote.client,
    project: quote.project,
    intro: quote.intro,
    issuedAt: new Date(quote.issuedAt),
    validUntil: new Date(quote.validUntil),
    vatRate: quote.vatRate,
    lineItems: quote.lineItems,
    metadata: quote.metadata,
    acceptance: quote.acceptance ?? null,
  };
}
