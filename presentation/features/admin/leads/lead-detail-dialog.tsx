"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { getLeadDetailAction } from "@/application/lead/admin.actions";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { LeadCreateQuoteButton } from "@/presentation/features/admin/leads/lead-create-quote-button";
import {
  LeadOutreachEditor,
  SaveOutreachButton,
} from "@/presentation/features/admin/leads/lead-outreach-editor";
import type {
  LeadOutreachEditorHandle,
  LeadOutreachEditorState,
} from "@/presentation/features/admin/leads/lead-outreach-editor";
import { WebsiteLink } from "@/presentation/features/admin/leads/lead-website-link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/presentation/components/ui/alert-dialog";
import { cn } from "@/presentation/lib/utils";
import {
  QUALIFICATION_LABEL,
  WEBVITAL_TONE,
  TRACKER_BADGE,
  formatWebVital,
  getWebVitalTone,
  getStatusBadgeClass,
  getOutreachLabel,
  isSlowWithAds,
} from "./lead-dialog-utils";

interface LeadDetailDialogProps {
  leadId: string;
  leadCompanyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
        getStatusBadgeClass(status)
      )}
    >
      {QUALIFICATION_LABEL[status]}
    </span>
  );
}

function PageSpeedBand({
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
        <p className="px-6 py-3 border-b border-border m-0 font-hanken text-[13px] text-soft">
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
      );
    }
    if (lead.status === "new" && !lead.website) {
      return (
        <p className="px-6 py-3 border-b border-border m-0 font-hanken text-[13px] text-soft">
          Lead salvato senza indirizzo web: nessuna analisi PageSpeed eseguita.
          Puoi contattarlo via telefono o email.
        </p>
      );
    }
    return (
      <p className="px-6 py-3 border-b border-border m-0 font-hanken text-[13px] text-soft">
        Nessuna analisi disponibile per questo lead.
      </p>
    );
  }

  const vitals = [
    { label: "LCP", value: latest.lcp, unit: "s", ideal: "\u2264 2.5 s", good: 2.5, poor: 4 },
    { label: "FCP", value: latest.fcp, unit: "s", ideal: "\u2264 1.8 s", good: 1.8, poor: 3 },
    { label: "CLS", value: latest.cls, ideal: "\u2264 0.1", good: 0.1, poor: 0.25 },
    { label: "TBT", value: latest.tbt, unit: "ms", ideal: "\u2264 200 ms", good: 200, poor: 600 },
  ];

  return (
    <div className="px-6 py-3 flex flex-wrap items-center gap-2 border-b border-border overflow-x-auto">
      {vitals.map((v) => (
        <div
          key={v.label}
          className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-lg border border-border bg-raised px-3 py-1.5"
          title={`ideale ${v.ideal}`}
        >
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">
            {v.label}
          </span>
          <span
            className={cn(
              "font-mono tabular-nums text-[15px] leading-none",
              v.value === undefined || v.value === null
                ? "text-dim"
                : WEBVITAL_TONE[getWebVitalTone(v.value, v.good, v.poor)]
            )}
          >
            {v.value === undefined || v.value === null ? (
              "\u2014"
            ) : (
              <>
                {formatWebVital(v.value)}
                {v.unit && <span className="text-dim text-[12px]"> {v.unit}</span>}
              </>
            )}
          </span>
        </div>
      ))}
      <span className="ml-auto shrink-0 font-mono text-[10.5px] text-dim whitespace-nowrap">
        {latest.strategy} &middot; {formatDateIt(latest.analyzedAt)}
      </span>
    </div>
  );
}

function TrackerBadge({ tracker }: { tracker: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-accent border border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] rounded-full px-2.5 py-[3px] bg-accent/[0.06]"
    >
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

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        {[11, 7, 7, 7, 7, 7].map((w, i) => (
          <div
            key={i}
            className="h-[22px] rounded-md bg-foreground/[0.05] animate-pulse"
            style={{ width: `${w}rem` }}
          />
        ))}
      </div>
      <div className="space-y-4">
        {[9, 7, 7, 11, 7].map((w, i) => (
          <div
            key={i}
            className="h-[22px] rounded-md bg-foreground/[0.05] animate-pulse"
            style={{ width: `${w}rem` }}
          />
        ))}
      </div>
    </div>
  );
}

export function LeadDetailDialog({
  leadId,
  leadCompanyName,
  open,
  onOpenChange,
}: LeadDetailDialogProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [analyses, setAnalyses] = useState<LeadAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<LeadOutreachEditorHandle>(null);
  const [outreachState, setOutreachState] = useState<LeadOutreachEditorState>({
    dirty: false,
    pending: false,
  });
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

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
    const cancelled = { value: false };
    const timeoutId = window.setTimeout(() => {
      if (!cancelled.value) void load();
    }, 0);
    return () => {
      cancelled.value = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, load]);

  const loading = open && lead === null && error === null;

  const reset = () => {
    setLead(null);
    setAnalyses([]);
    setError(null);
    setOutreachState({ dirty: false, pending: false });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && outreachState.dirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(next);
    if (!next) reset();
  };

  const discardAndClose = () => {
    setConfirmCloseOpen(false);
    setOutreachState({ dirty: false, pending: false });
    onOpenChange(false);
    reset();
  };

  const saveAndClose = () => {
    setConfirmCloseOpen(false);
    editorRef.current?.save();
    setOutreachState({ dirty: false, pending: false });
    onOpenChange(false);
    reset();
  };

  const displayName = loading ? leadCompanyName : (lead?.companyName ?? leadCompanyName);
  const latestAnalysis = analyses[0];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-0 flex-row items-center justify-between gap-3">
            <DialogTitle className="font-space text-lg truncate m-0">
              {displayName}
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {lead && <StatusBadge status={lead.status} />}
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => handleOpenChange(false)}
                className="inline-flex items-center justify-center size-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden />
              </button>
            </div>
          </DialogHeader>

          {/* KPI Sub-header */}
          {lead && (
            <div className="px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border">
              <KpiItem label="Score">
                <LeadScoreBadge score={latestAnalysis?.performanceScore} />
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
          )}

          {/* PageSpeed band */}
          {lead && <PageSpeedBand lead={lead} analyses={analyses} />}

          {/* Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-6 py-6">
            {error ? (
              <p role="alert" className="font-mono text-[12.5px] text-[var(--coral)]">
                {error}
              </p>
            ) : loading ? (
              <LoadingSkeleton />
            ) : lead ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column: Anagrafica */}
                <section className="flex flex-col">
                  <h3 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground mb-4">
                    Anagrafica
                  </h3>
                  <div className="flex flex-col">
                    {field("Categoria", lead.category)}
                    {field("Sito", lead.website ? <WebsiteLink url={lead.website} /> : undefined)}
                    {field("Telefono", lead.phone)}
                    {field("Email", lead.email)}
                    {field("Indirizzo", lead.address)}
                    {field("Citt&agrave;", lead.city)}
                    {field("Fonte", lead.source)}
                    {field("Creato il", formatDateIt(lead.createdAt))}
                  </div>
                </section>

                {/* Right column: Vendita + Tracking */}
                <div className="flex flex-col gap-6">
                  <section>
                    <h3 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground mb-4">
                      Stato Outreach &amp; Vendita
                    </h3>
                    <LeadOutreachEditor
                      ref={editorRef}
                      leadId={lead.id}
                      outreachStatus={lead.outreachStatus}
                      outreachNotes={lead.outreachNotes}
                      onStateChange={setOutreachState}
                    />
                  </section>

                  <section>
                    <h3 className="font-space text-[13px] tracking-[0.1em] uppercase text-foreground mb-4">
                      Tracciamento &amp; Campaign Ads
                    </h3>
                    <TrackingAdsSection
                      lead={lead}
                      performanceScore={latestAnalysis?.performanceScore}
                    />
                  </section>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {lead && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <SaveOutreachButton
                state={outreachState}
                onSave={() => editorRef.current?.save()}
              />
              {lead.status === "qualified" && (
                <LeadCreateQuoteButton leadId={lead.id} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved-changes guard */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent className="sm:max-w-[520px]">
          <button
            type="button"
            aria-label="Abbandona e chiudi"
            onClick={discardAndClose}
            className="absolute top-4 right-4 inline-flex items-center justify-center size-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Uscire senza salvare?</AlertDialogTitle>
            <AlertDialogDescription>
              Hai modifiche non salvate allo stato di vendita. Cosa vuoi fare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-[10px]">
            <AlertDialogCancel className="w-full">Indietro</AlertDialogCancel>
            <AlertDialogAction className="w-full" onClick={saveAndClose}>
              Salva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
