import Link from "next/link";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
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

/**
 * Card describing a single lead-generation job: query, location, lifecycle
 * status and progress counters. Matches the admin list card weight (surface
 * card, mono labels, soft border). Clicking the card narrows the leads list
 * to the leads this job produced (?job=<id>); `active` highlights the
 * currently applied job filter.
 */
export function LeadJobStatus({ job, active = false, foundCount }: LeadJobStatusProps) {
  return (
    <Link
      href={`/admin/leads?job=${job.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border bg-surface px-4 py-3.5 transition-colors hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
        active
          ? "border-accent bg-accent/[0.05]"
          : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-space text-[14px] font-semibold text-foreground truncate">
            {job.query}
          </span>
          {job.location && (
            <span className="font-mono text-[11px] text-dim">{job.location}</span>
          )}
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
            JOB_STYLE[job.status]
          )}
        >
          {JOB_LABEL[job.status]}
        </span>
      </div>

      <p className="font-mono text-[12.5px] text-muted">
        Trovati{" "}
        <span className="text-foreground">
          {foundCount ?? job.totalFound}
        </span>
        {" · "}Analizzati <span className="text-foreground">{job.analyzed}</span>
        {" · "}Qualificati{" "}
        <span className="text-foreground">{job.qualified}</span>
      </p>

      {job.error && (
        <p
          role="alert"
          className="font-mono text-[12px] text-[var(--coral)] m-0"
        >
          {job.error}
        </p>
      )}
    </Link>
  );
}