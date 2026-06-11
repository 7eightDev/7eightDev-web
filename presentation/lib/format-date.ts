const MONTHS_IT = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

/**
 * Deterministic Italian date formatting (e.g. "10 giugno 2026").
 * Avoids Intl so output does not depend on the runtime's ICU build.
 */
export function formatDateIt(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS_IT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
