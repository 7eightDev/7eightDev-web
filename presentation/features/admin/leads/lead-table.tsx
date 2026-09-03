import type { Lead, LeadStatus } from "@/domain/lead/lead.types";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadRowActions } from "@/presentation/features/admin/leads/lead-row-actions";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { cn } from "@/presentation/lib/utils";

export interface LeadTableRow {
  lead: Lead;
  /** PageSpeed performance score for the lead's latest analysis, if any. */
  score?: number;
}

interface LeadTableProps {
  rows: LeadTableRow[];
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  analyzed: "text-accent-cyan border-[color-mix(in_oklab,var(--color-accent-cyan)_45%,var(--border))]",
  qualified: "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  discarded: "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]",
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "nuovo",
  analyzed: "analizzato",
  qualified: "qualificato",
  discarded: "scartato",
};

/**
 * Responsive table of leads. Rows are surface cards on every breakpoint
 * (mirroring the catalog list), with the company name, site, status badge,
 * performance score, creation date and per-row actions.
 */
export function LeadTable({ rows }: LeadTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ lead, score }) => (
        <div
          key={lead.id}
          className="grid grid-cols-[1fr_auto_auto] max-[820px]:grid-cols-1 gap-4 items-center rounded-xl border border-border bg-surface px-5 py-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-space text-[15.5px] font-semibold text-foreground">
                {lead.companyName}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
                  STATUS_STYLE[lead.status]
                )}
              >
                {STATUS_LABEL[lead.status]}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              {lead.website && (
                <span className="font-mono text-[11.5px] text-dim truncate max-w-full">
                  {lead.website}
                </span>
              )}
              {lead.city && (
                <span className="font-mono text-[11.5px] text-dim">· {lead.city}</span>
              )}
              {lead.category && (
                <span className="font-mono text-[11.5px] text-dim">
                  · {lead.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-[3px]">
              <LeadScoreBadge score={score} />
              <span className="font-mono text-[10.5px] text-muted">
                {formatDateIt(lead.createdAt)}
              </span>
            </div>
            <LeadRowActions id={lead.id} companyName={lead.companyName} />
          </div>
        </div>
      ))}
    </div>
  );
}