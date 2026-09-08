"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { getLeadDetailAction } from "@/application/lead/admin.actions";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { LeadCreateQuoteButton } from "@/presentation/features/admin/leads/lead-create-quote-button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import { cn } from "@/presentation/lib/utils";

interface LeadDetailSheetProps {
  /** Lead to render. May be partial (only company link present) while loading. */
  leadId: string;
  /** Shown in the header while the full detail loads. */
  leadCompanyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUALIFICATION_LABEL: Record<Lead["status"], string> = {
  new: "Da analizzare",
  analyzed: "Analizzato",
  qualified: "Qualificato",
  discarded: "Scartato",
};

/** Rounds lab values that can carry float noise (e.g. 2.6500000000000001). */
function formatWebVital(value: number): string {
  return String(Math.round(value * 100) / 100);
}

type WebVitalTone = "ok" | "warn" | "bad";

interface WebVitalProps {
  label: string;
  value: number | undefined;
  unit?: string;
  /** Good/reference threshold (e.g. "≤ 2.5 s") so the gap is readable at a glance. */
  ideal: string;
  /**
   * Ideal (best) value, lower is better. Used to colour the metric by how far
   * the actual value drifts above it.
   */
  good: number;
  /** Poor threshold: a value at/above this reads as red. */
  poor: number;
}

const WEBVITAL_TONE: Record<WebVitalTone, string> = {
  ok: "text-[var(--accent)]",
  warn: "text-[var(--accent-amber)]",
  bad: "text-[var(--coral)]",
};

/**
 * A single Web-Vital metric. Value is formatted (max 2 decimals) and clamped
 * to the cell with `truncate` so a long number never bleeds into the metric
 * next to it; the ideal value sits on its own line underneath. The metric is
 * coloured by how far the real value drifts above the ideal: green at or below
 * `good`, amber in the warning band, red once past `poor`.
 */
function WebVital({ label, value, unit, ideal, good, poor }: WebVitalProps) {
  let tone: WebVitalTone = "ok";
  if (value !== undefined && value !== null) {
    if (value >= poor) tone = "bad";
    else if (value > good) tone = "warn";
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums text-[15px] truncate min-w-0",
          value === undefined || value === null ? "text-dim" : WEBVITAL_TONE[tone]
        )}
      >
        {value === undefined || value === null ? (
          <span className="text-dim">—</span>
        ) : (
          <>
            {formatWebVital(value)}
            {unit && <span className="text-dim text-[12px]"> {unit}</span>}
          </>
        )}
      </span>
      <span className="font-mono text-[10.5px] text-muted truncate min-w-0">
        ideale {ideal}
      </span>
    </div>
  );
}

function field(label: string, value: string | undefined) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted shrink-0">
        {label}
      </span>
      <span className="font-hanken text-[14px] text-foreground text-right break-words">
        {value || <span className="text-dim">—</span>}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
        status === "qualified"
          ? "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]"
          : status === "discarded"
            ? "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]"
            : "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]"
      )}
    >
      {QUALIFICATION_LABEL[status]}
    </span>
  );
}

function PageSpeedSection({
  lead,
  analyses,
}: {
  lead: Lead;
  analyses: LeadAnalysis[];
}) {
  const latest = analyses[0];

  if (!latest) {
    if (lead.status === "discarded") {
      return (
        <p className="font-hanken text-soft m-0">
          Analisi PageSpeed fallita: il lead è stato scartato.
          {lead.analysisError && (
            <>
              {" "}
              <span className="text-[var(--coral)] font-medium">
                {lead.analysisError}
              </span>
            </>
          )}
        </p>
      );
    }
    if (lead.status === "new" && !lead.website) {
      return (
        <p className="font-hanken text-soft m-0">
          Lead salvato senza indirizzo web: nessuna analisi PageSpeed eseguita.
          Puoi contattarlo via telefono o email.
        </p>
      );
    }
    return (
      <p className="font-hanken text-soft m-0">
        Nessuna analisi disponibile per questo lead.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-5">
        <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
          Performance
        </span>
        <LeadScoreBadge score={latest.performanceScore} />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
        <WebVital label="LCP" value={latest.lcp} unit="s" ideal="≤ 2.5 s" good={2.5} poor={4} />
        <WebVital label="FCP" value={latest.fcp} unit="s" ideal="≤ 1.8 s" good={1.8} poor={3} />
        <WebVital label="CLS" value={latest.cls} ideal="≤ 0.1" good={0.1} poor={0.25} />
        <WebVital label="TBT" value={latest.tbt} unit="ms" ideal="≤ 200 ms" good={200} poor={600} />
      </div>
      <p className="font-mono text-[11px] text-muted m-0">
        Strumento: <span className="text-soft">{latest.strategy}</span>
        {" · "}Analizzato il {formatDateIt(latest.analyzedAt)}
      </p>
    </>
  );
}

/**
 * Slide-over detail for a single lead. The list stays visible underneath; the
 * full lead + analyses are fetched lazily when the sheet opens.
 */
export function LeadDetailSheet({
  leadId,
  leadCompanyName,
  open,
  onOpenChange,
}: LeadDetailSheetProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [analyses, setAnalyses] = useState<LeadAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch on open. State is only written after the awaited server action, so
  // the effect performs no synchronous setState (the parent keys this
  // component by leadId, remounting it for each new detail).
  const load = useCallback(async () => {
    try {
      const result = await getLeadDetailAction(leadId);
      if (!result.ok) {
        setError(result.error ?? "Impossibile caricare il dettaglio.");
      } else {
        setLead(result.lead);
        setAnalyses(result.analyses);
      }
    } catch {
      setError("Impossibile caricare il dettaglio.");
    }
  }, [leadId]);

  useEffect(() => {
    if (!open) return;
    // Deferred so the fetch runs in a callback, not synchronously in the
    // effect body (the loading skeleton is derived and shows immediately
    // because this component is keyed by leadId and remounts per detail).
    const cancelled = { value: false };
    const timeoutId = window.setTimeout(() => {
      if (!cancelled.value) void load();
    }, 0);
    return () => {
      cancelled.value = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, load]);

  // Loading is derived: nothing loaded yet and no error while the sheet is up.
  const loading = open && lead === null && error === null;

  const reset = () => {
    setLead(null);
    setAnalyses([]);
    setError(null);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent className="w-full sm:max-w-lg gap-6 p-6">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <SheetTitle className="font-space truncate">
              {loading ? leadCompanyName : (lead?.companyName ?? leadCompanyName)}
            </SheetTitle>
            {lead && <StatusBadge status={lead.status} />}
          </div>
        </SheetHeader>

        {error ? (
          <p
            role="alert"
            className="font-mono text-[12.5px] text-[var(--coral)]"
          >
            {error}
          </p>
        ) : (
          <div className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden custom-scrollbar -mx-1 px-1">
            {loading ? (
              <div className="space-y-4">
                {[11, 7, 7, 7, 7, 7, 7, 7].map((w, i) => (
                  <div
                    key={i}
                    className="h-[22px] rounded-md bg-foreground/[0.05] animate-pulse"
                    style={{ width: `${w}rem` }}
                  />
                ))}
              </div>
            ) : lead ? (
              <>
                <section className="flex flex-col">
                  {field("Categoria", lead?.category)}
                  {field("Sito", lead?.website)}
                  {field("Telefono", lead?.phone)}
                  {field("Email", lead?.email)}
                  {field("Indirizzo", lead?.address)}
                  {field("Città", lead?.city)}
                  {field("Fonte", lead?.source)}
                  {field("Creato il", formatDateIt(lead?.createdAt))}
                </section>

                <section>
                  <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-4">
                    Analisi PageSpeed
                  </h3>
                  <PageSpeedSection lead={lead} analyses={analyses} />
                </section>
              </>
            ) : null}
          </div>
        )}

        <SheetFooter>
          {lead && lead.status === "qualified" && (
            <LeadCreateQuoteButton leadId={lead.id} />
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}