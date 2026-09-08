/**
 * Raised by a persistence adapter when a save fails because another row
 * already holds the quote number. Adapters translate storage-specific unique
 * violations (e.g. Prisma P2002 on `number`) into this error so the create
 * use case can regenerate the number and retry without knowing the database.
 */
export class QuoteNumberConflictError extends Error {
  constructor() {
    super("Numero preventivo già assegnato.");
    this.name = "QuoteNumberConflictError";
  }
}