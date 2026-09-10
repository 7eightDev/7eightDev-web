import type { CreateQuoteInput } from "@/application/quote/quote.schemas";

const STORAGE_KEY = "leadQuoteInput";

/** Stores a pre-populated quote input in sessionStorage for the composer. */
export function storeLeadQuoteInput(input: CreateQuoteInput): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {
    // sessionStorage unavailable (SSR or private browsing) — silently ignore.
  }
}

/** Reads and clears the pre-populated quote input from sessionStorage. */
export function consumeLeadQuoteInput(): CreateQuoteInput | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as CreateQuoteInput;
  } catch {
    return null;
  }
}
