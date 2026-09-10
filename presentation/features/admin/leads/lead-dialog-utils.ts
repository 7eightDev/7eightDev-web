import type { Lead } from "@/domain/lead/lead.types";

export const QUALIFICATION_LABEL: Record<Lead["status"], string> = {
  new: "Da analizzare",
  analyzed: "Analizzato",
  qualified: "Qualificato",
  discarded: "Scartato",
};

/** Rounds lab values that can carry float noise (e.g. 2.6500000000000001). */
export function formatWebVital(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export type WebVitalTone = "ok" | "warn" | "bad";

export function getWebVitalTone(
  value: number | undefined | null,
  good: number,
  poor: number
): WebVitalTone {
  if (value === undefined || value === null) return "ok";
  if (value >= poor) return "bad";
  if (value > good) return "warn";
  return "ok";
}

export const WEBVITAL_TONE: Record<WebVitalTone, string> = {
  ok: "text-[var(--accent)]",
  warn: "text-[var(--accent-amber)]",
  bad: "text-[var(--coral)]",
};

const OUTREACH_LABEL: Record<Lead["outreachStatus"], string> = {
  not_contacted: "Da contattare",
  audit_sent: "Audit inviato",
  in_talks: "In trattativa",
  closed_won: "Cliente",
  rejected: "Rifiutato",
};

export function getOutreachLabel(status: Lead["outreachStatus"]): string {
  return OUTREACH_LABEL[status];
}

export function getStatusBadgeClass(status: Lead["status"]): string {
  if (status === "qualified")
    return "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]";
  if (status === "discarded")
    return "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]";
  return "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]";
}

export const TRACKER_BADGE: Record<string, string> = {
  "Google Ads": "Google Ads",
  "Meta Pixel": "Meta Pixel (FB/IG)",
  GTM: "Google Tag Manager",
};

export function getTrackerLabel(tracker: string): string {
  return TRACKER_BADGE[tracker] ?? tracker;
}

export function isSlowWithAds(
  hasAds: boolean | undefined,
  performanceScore: number | undefined
): boolean {
  return (
    hasAds === true &&
    performanceScore !== undefined &&
    performanceScore < 50
  );
}
