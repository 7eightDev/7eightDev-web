import type { ZodError } from "zod";

/**
 * Turns a Zod validation error into a single human-readable message for the
 * admin composer. Shared by createQuote/updateQuote so both report identically.
 *
 * The schema messages are already self-describing in Italian (e.g. "Nome
 * cliente obbligatorio"), so the technical dotted path is dropped. Line-item
 * issues keep a 1-based "Voce N" prefix so the user knows which row to fix.
 */
export function firstValidationMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Dati del preventivo non validi.";

  const path = issue.path;
  if (path[0] === "lineItems") {
    const index = Number(path[1]);
    if (Number.isInteger(index)) {
      return `Voce ${index + 1}: ${issue.message}`;
    }
  }
  return issue.message;
}
