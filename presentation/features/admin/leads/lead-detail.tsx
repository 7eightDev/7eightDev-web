import type { ReactNode } from "react";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { LeadCreateQuoteButton } from "@/presentation/features/admin/leads/lead-create-quote-button";
import { LeadOutreachEditorWithActions } from "@/presentation/features/admin/leads/lead-outreach-editor";
import { WebsiteLink } from "@/presentation/features/admin/leads/lead-website-link";
import { cn } from "@/presentation/lib/utils";
import {
  QUALIFICATION_LABEL,
  TRACKER_BADGE,
  getOutreachLabel,
  getStatusBadgeClass,
  isSlowWithAds,
} from "@/presentation/features/admin/leads/lead-dialog-utils";

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

function TrackerBadge({ tracker }: { tracker: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-accent border border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] rounded-full px-2.5 py-[3px] bg-accent/[0.06]">
      <span className="inline-block size-1.5 rounded-full bg-accent" />
      {TRACKER_BADGE[tracker] ?? tracker}
    </span>
  );
}

function TrackingAdsSection({
  lead,
  performanceScore,
}: {
  lead: Lead;
  performanceScore: number | undefined;
}) {
  const trackers = lead.adsTrackers ?? [];

  if (trackers.length === 0) {
    return (
      <p className="font-hanken text-soft m-0">
        Nessun tracker pubblicitario rilevato sul sito.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {trackers.map((tracker) => (
          <TrackerBadge key={tracker} tracker={tracker} />
        ))}
      </div>
      {isSlowWithAds(lead.hasAds, performanceScore) && (
        <p className="mt-3 font-mono text-[12px] text-[var(--coral)] border border-[color-mix(in_oklab,var(--coral)_45%,var(--border))] bg-[var(--coral)]/10 rounded-lg px-3 py-2">
          Priorit&agrave; Alta: Budget Ads Sprecato su Sito Lento
        </p>
      )}
    </>
  );
}

function KpiItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Full-page detail view for a single lead. Layout:
 * - Header: company name + status badge
 * - KPI sub-header: score, outreach, source, date
 * - Body: two columns (anagrafica | vendita + pagespeed + tracking)
 */
export function LeadDetail({ lead, analyses }: LeadDetailProps) {
  const latest = analyses[0];

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-space text-xl font-semibold text-foreground m-0">
            {lead.companyName}
          </h2>
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
              getStatusBadgeClass(lead.status)
            )}
          >
            {QUALIFICATION_LABEL[lead.status]}
          </span>
        </div>
        {lead.status === "qualified" && (
          <LeadCreateQuoteButton leadId={lead.id} />
        )}
      </div>

      {/* KPI Sub-header */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border">
        <KpiItem label="Score">
          <LeadScoreBadge score={latest?.performanceScore} />
        </KpiItem>
        <KpiItem label="Outreach">
          <span className="font-hanken text-[13px] text-foreground">
            {getOutreachLabel(lead.outreachStatus)}
          </span>
        </KpiItem>
        <KpiItem label="Fonte">
          <span className="font-hanken text-[13px] text-foreground">
            {lead.source}
          </span>
        </KpiItem>
        <KpiItem label="Creato il">
          <span className="font-hanken text-[13px] text-foreground">
            {formatDateIt(lead.createdAt)}
          </span>
        </KpiItem>
      </div>

      {/* Body: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left column: Anagrafica */}
        <section className="p-6 border-b lg:border-b-0 lg:border-r border-border">
          <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-4">
            Anagrafica
          </h3>
          <div className="flex flex-col">
            {field("Categoria", lead.category)}
            {field("Sito", lead.website ? <WebsiteLink url={lead.website} /> : undefined)}
            {lead.techStack && lead.techStack.length > 0 &&
              field("Tech / Stack", lead.techStack.join(", "))}
            {field("Telefono", lead.phone)}
            {field("Email", lead.email)}
            {field("Indirizzo", lead.address)}
            {field("Citt&agrave;", lead.city)}
            {field("Fonte", lead.source)}
            {field("Creato il", formatDateIt(lead.createdAt))}
          </div>
        </section>

        {/* Right column: Vendita + PageSpeed + Tracking */}
        <div className="flex flex-col">
          <section className="p-6 border-b border-border">
            <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-4">
              Stato Outreach &amp; Vendita
            </h3>
            <LeadOutreachEditorWithActions
              leadId={lead.id}
              outreachStatus={lead.outreachStatus}
              lastContactedAt={lead.lastContactedAt}
              outreachNotes={lead.outreachNotes}
            />
          </section>

          <section className="p-6 border-b border-border">
            <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-4">
              Analisi PageSpeed
            </h3>

            {!latest ? (
              lead.status === "discarded" ? (
                <p className="font-hanken text-soft m-0">
                  Analisi PageSpeed fallita: il lead &egrave; stato scartato.
                  {lead.analysisError && (
                    <>
                      {" "}
                      <span className="text-[var(--coral)] font-medium">
                        {lead.analysisError}
                      </span>
                    </>
                  )}
                </p>
              ) : lead.status === "new" && !lead.website ? (
                <p className="font-hanken text-soft m-0">
                  Lead salvato senza indirizzo web: nessuna analisi PageSpeed
                  eseguita. Puoi contattarlo via telefono o email.
                </p>
              ) : (
                <p className="font-hanken text-soft m-0">
                  Nessuna analisi disponibile per questo lead.
                </p>
              )
            ) : (
              <>
                <div className="flex flex-col gap-1 mb-5">
                  <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
                    Performance
                  </span>
                  <LeadScoreBadge score={latest.performanceScore} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
                  {[
                    { label: "LCP", value: latest.lcp, unit: "s", ideal: "\u2264 2.5 s", good: 2.5, poor: 4 },
                    { label: "FCP", value: latest.fcp, unit: "s", ideal: "\u2264 1.8 s", good: 1.8, poor: 3 },
                    { label: "CLS", value: latest.cls, unit: undefined, ideal: "\u2264 0.1", good: 0.1, poor: 0.25 },
                    { label: "TBT", value: latest.tbt, unit: "ms", ideal: "\u2264 200 ms", good: 200, poor: 600 },
                  ].map((v) => (
                    <div key={v.label} className="flex min-w-0 flex-col gap-1">
                      <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
                        {v.label}
                      </span>
                      <span className="font-mono tabular-nums text-[15px] text-foreground truncate min-w-0">
                        {v.value === undefined || v.value === null ? (
                          <span className="text-dim">&mdash;</span>
                        ) : (
                          <>
                            {String(Math.round(v.value * 100) / 100)}
                            {v.unit && <span className="text-dim text-[12px]"> {v.unit}</span>}
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[10.5px] text-muted truncate min-w-0">
                        ideale {v.ideal}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[11px] text-muted m-0">
                  Strumento: <span className="text-soft">{latest.strategy}</span>
                  {" &middot; "}Analizzato il {formatDateIt(latest.analyzedAt)}
                </p>
              </>
            )}
          </section>

          <section className="p-6">
            <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-4">
              Tracciamento &amp; Campaign Ads
            </h3>
            <TrackingAdsSection
              lead={lead}
              performanceScore={latest?.performanceScore}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
