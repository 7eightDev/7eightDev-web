import Link from "next/link";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import { LeadJobFavoriteButton } from "@/presentation/features/admin/leads/lead-job-favorite-button";
import { LeadJobDeleteButton } from "@/presentation/features/admin/leads/lead-job-delete-button";
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
      {/* Header row — actions sit here, outside the Link */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span
          className={cn(
            "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
            JOB_STYLE[job.status]
          )}
        >
          {JOB_LABEL[job.status]}
        </span>

        <div className="flex items-center gap-0.5">
          <LeadJobFavoriteButton
            jobId={job.id}
            favorite={job.favorite ?? false}
          />
          <LeadJobDeleteButton
            jobId={job.id}
            jobQuery={job.query}
            jobLocation={job.location}
          />
        </div>
      </div>

      {/* Body — the interactive anchor, covering query/location/stats */}
      <Link
        href={`/admin/leads?job=${job.id}`}
        aria-current={active ? "page" : undefined}
        className="group flex flex-col gap-2 px-4 pt-1 pb-3"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-space text-[14px] font-semibold text-foreground truncate">
            {job.query}
          </span>

          {job.location && (
            <span className="font-mono text-[11px] text-dim truncate">{job.location}</span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[12px] text-muted mt-1">
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
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
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
