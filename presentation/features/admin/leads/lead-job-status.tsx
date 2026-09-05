import Link from "next/link";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import { LeadJobRerunButton } from "@/presentation/features/admin/leads/lead-job-rerun-button";
import { cn } from "@/presentation/lib/utils";

interface LeadJobStatusProps {
  job: LeadGenerationJob;
  active?: boolean;
  foundCount?: number;
}

const JOB_STYLE: Record<LeadGenerationJob["status"], string> = {
  pending: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  running: "text-accent-cyan border-[color-mix(in_oklab,var(--color-accent-cyan)_45%,var(--border))]",
  completed: "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  failed: "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]",
};

const JOB_LABEL: Record<LeadGenerationJob["status"], string> = {
  pending: "in coda",
  running: "in corso",
  completed: "completato",
  failed: "fallito",
};

export function LeadJobStatus({ job, active = false, foundCount }: LeadJobStatusProps) {
  const rerunnable =
    job.status === "completed" || job.status === "failed";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors",
        active
          ? "border-accent bg-accent/[0.05]"
          : "border-border hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]"
      )}
    >
      <Link
        href={`/admin/leads?job=${job.id}`}
        aria-current={active ? "page" : undefined}
        className="group flex flex-col gap-2.5 px-4 py-3.5"
      >
        {/* Badge stato — solo, niente altro sulla stessa riga */}
        <span
          className={cn(
            "self-start font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
            JOB_STYLE[job.status]
          )}
        >
          {JOB_LABEL[job.status]}
        </span>

        <div className="flex flex-col gap-0.5 mt-1.5">
          {/* Titolo ricerca */}
          <span className="font-space text-[14px] font-semibold text-foreground truncate">
            {job.query}
          </span>

          {/* Luogo ricerca */}
          {job.location && (
            <span className="font-mono text-[11px] text-dim truncate">{job.location}</span>
          )}
        </div>

        {/* Risultati — icone al posto delle label */}
        <div className="flex items-center gap-3 font-mono text-[12px] text-muted mt-2">
          <span className="inline-flex items-center gap-1" title="Trovati">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="opacity-70 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="text-foreground">{foundCount ?? job.totalFound}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Analizzati">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="opacity-70 shrink-0">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-foreground">{job.analyzed}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Qualificati">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="opacity-70 shrink-0">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />
            </svg>
            <span className="text-foreground">{job.qualified}</span>
          </span>
        </div>

        {job.error && (
          <p
            role="alert"
            className="font-mono text-[12px] text-[var(--coral)] m-0"
          >
            {job.error}
          </p>
        )}
      </Link>

      {rerunnable && (
        <div className="flex items-center border-t border-border/70 px-4 py-1.5">
          <LeadJobRerunButton jobId={job.id} />
        </div>
      )}
    </div>
  );
}
