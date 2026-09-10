import type { ReactNode } from "react";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadOutreachEditorWithActions } from "@/presentation/features/admin/leads/lead-outreach-editor";
import { WebsiteLink } from "@/presentation/features/admin/leads/lead-website-link";
import { cn } from "@/presentation/lib/utils";
import {
  TRACKER_BADGE,
  getOutreachLabel,
  isSlowWithAds,
  formatWebVital,
  getWebVitalTone,
  WEBVITAL_TONE,
} from "@/presentation/features/admin/leads/lead-dialog-utils";

const TRACKER_ACRONYM: Record<string, string> = {
  "Google Ads": "GA",
  "Meta Pixel": "META",
  GTM: "GTM",
};

interface LeadDetailProps {
  lead: Lead;
  analyses: LeadAnalysis[];
}

function field(label: string, value: ReactNode) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted shrink-0">
        {label}
      </span>
      <span className="font-hanken text-[14px] text-foreground text-right break-words">
        {value || <span className="text-dim">&mdash;</span>}
      </span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  ideal,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  ideal?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 bg-raised border border-border rounded-xl px-4 py-4 min-w-0", className)}>
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">
        {label}
      </span>
      <span className="font-mono tabular-nums text-[22px] leading-tight text-foreground truncate">
        {value ?? <span className="text-dim">&mdash;</span>}
        {unit && typeof value === "number" && (
          <span className="text-dim text-[14px]"> {unit}</span>
        )}
      </span>
      {ideal && (
        <span className="font-mono text-[10px] text-muted truncate">
          {ideal}
        </span>
      )}
    </div>
  );
}

export function LeadDetail({ lead, analyses }: LeadDetailProps) {
  const latest = analyses[0];

  const trackers = lead.adsTrackers ?? [];
  const adsValue =
    trackers.length > 0
      ? trackers.map((t) => TRACKER_BADGE[t] ?? t).join(", ")
      : "Sì";
  const showAdsAlert = isSlowWithAds(lead.hasAds, latest?.performanceScore);

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Score"
          className="bg-accent/[0.08] border-accent/40"
          value={
            latest?.performanceScore != null ? (
              <span
                className={cn(
                  "font-mono tabular-nums text-[36px] leading-none",
                  latest.performanceScore < 50
                    ? "text-accent"
                    : "text-muted"
                )}
              >
                {latest.performanceScore}
              </span>
            ) : undefined
          }
          ideal=""
        />
        <KpiCard
          label="LCP"
          value={
            latest?.lcp != null ? (
              <span
                className={cn(
                  "font-mono tabular-nums text-[22px] leading-tight",
                  WEBVITAL_TONE[getWebVitalTone(latest.lcp, 2.5, 4)]
                )}
              >
                {formatWebVital(latest.lcp)}
              </span>
            ) : undefined
          }
          unit="s"
          ideal="≤ 2.5 s"
        />
        <KpiCard
          label="FCP"
          value={
            latest?.fcp != null ? (
              <span
                className={cn(
                  "font-mono tabular-nums text-[22px] leading-tight",
                  WEBVITAL_TONE[getWebVitalTone(latest.fcp, 1.8, 3)]
                )}
              >
                {formatWebVital(latest.fcp)}
              </span>
            ) : undefined
          }
          unit="s"
          ideal="≤ 1.8 s"
        />
        <KpiCard
          label="CLS"
          value={
            latest?.cls != null ? (
              <span
                className={cn(
                  "font-mono tabular-nums text-[22px] leading-tight",
                  WEBVITAL_TONE[getWebVitalTone(latest.cls, 0.1, 0.25)]
                )}
              >
                {formatWebVital(latest.cls)}
              </span>
            ) : undefined
          }
          ideal="≤ 0.1"
        />
        <KpiCard
          label="TBT"
          value={
            latest?.tbt != null ? (
              <span
                className={cn(
                  "font-mono tabular-nums text-[22px] leading-tight",
                  WEBVITAL_TONE[getWebVitalTone(latest.tbt, 200, 600)]
                )}
              >
                {formatWebVital(latest.tbt)}
              </span>
            ) : undefined
          }
          unit="ms"
          ideal="≤ 200 ms"
        />
        <KpiCard
          label="Tracking"
          value={
            trackers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {trackers.map((tracker) => {
                  const fullLabel = TRACKER_BADGE[tracker] ?? tracker;
                  const acronym =
                    TRACKER_ACRONYM[tracker] ??
                    tracker.slice(0, 4).toUpperCase();
                  return (
                    <span
                      key={tracker}
                      className="font-mono text-[10px] text-accent border border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] rounded-full px-2 py-[2px] bg-accent/[0.06]"
                      title={fullLabel}
                    >
                      {acronym}
                    </span>
                  );
                })}
              </div>
            ) : undefined
          }
          ideal={trackers.length > 0 ? undefined : "Google Ads"}
        />
      </div>

      {/* Budget Ads alert */}
      {showAdsAlert && (
        <div className="mb-6 font-mono text-[12px] text-[var(--coral)] border border-[color-mix(in_oklab,var(--coral)_45%,var(--border))] bg-[var(--coral)]/10 rounded-lg px-3 py-2">
          Priorit&agrave; Alta: Budget Ads Sprecato su Sito Lento
        </div>
      )}

      {/* Three side-by-side cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Dettagli Cliente */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground m-0">
              Dettagli Cliente
            </h2>
          </div>
          <div className="flex flex-col">
            {field("Azienda", lead.companyName)}
            {field("Categoria", lead.category)}
            {field(
              "Sito",
              lead.website ? <WebsiteLink url={lead.website} /> : undefined
            )}
            {field("Telefono", lead.phone)}
            {field("Email", lead.email)}
            {field("Indirizzo", lead.address)}
            {field("Città", lead.city)}
          </div>
        </section>

        {/* Contesto */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground m-0">
              Contesto
            </h2>
          </div>
          <div className="flex flex-col">
            {field("Outreach", getOutreachLabel(lead.outreachStatus))}
            {field("Fonte", lead.source)}
            {field("Creato il", formatDateIt(lead.createdAt))}
            {lead.techStack &&
              lead.techStack.length > 0 &&
              field("Tech Stack", lead.techStack.join(", "))}
            {(lead.hasAds || trackers.length > 0) &&
              field("Ads", adsValue)}
          </div>
        </section>

{/* Stato Vendita */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-6">
            <h2 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground m-0">
              Stato Vendita
            </h2>
            {lead.lastContactedAt && (
              <div className="flex flex-col items-end shrink-0">
                <span className="font-mono text-[11px] text-muted">
                  ultimo aggiornamento
                </span>
                <span className="font-hanken text-[13px] text-foreground">
                  {formatDateIt(lead.lastContactedAt)}
                </span>
              </div>
            )}
          </div>
          <LeadOutreachEditorWithActions
            leadId={lead.id}
            outreachStatus={lead.outreachStatus}
            outreachNotes={lead.outreachNotes}
          />
        </section>
      </div>
    </div>
  );
}
