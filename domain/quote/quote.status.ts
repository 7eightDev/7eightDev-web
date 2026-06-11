import type { QuoteStatus } from "@/domain/quote/quote.types";

/**
 * Quote lifecycle state machine.
 *
 *   draft ──send──▶ sent ──accept──▶ accepted
 *                    │ ╲──reject──▶ rejected
 *                    └───expire──▶ expired
 *
 * "Paid" is intentionally not a quote status: payment belongs to the
 * Billing bounded context. An accepted quote is terminal here.
 */
const TRANSITIONS: Readonly<Record<QuoteStatus, readonly QuoteStatus[]>> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidQuoteTransitionError extends Error {
  constructor(
    public readonly from: QuoteStatus,
    public readonly to: QuoteStatus
  ) {
    super(`Invalid quote transition: ${from} → ${to}`);
    this.name = "InvalidQuoteTransitionError";
  }
}

export function assertTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidQuoteTransitionError(from, to);
  }
}
