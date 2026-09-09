"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Lead, LeadOutreachStatus, LeadStatus } from "@/domain/lead/lead.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/presentation/components/ui/tooltip";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { LeadAdsBadge } from "@/presentation/features/admin/leads/lead-ads-badge";
import { LeadRowActions } from "@/presentation/features/admin/leads/lead-row-actions";
import { LeadDetailSheet } from "@/presentation/features/admin/leads/lead-detail-sheet";
import { extractCopyrightYear } from "@/domain/lead/lead.copyright";
import { cn } from "@/presentation/lib/utils";
import {
  toggleColumnSort,
  parseSortOption,
  type SortOption,
} from "@/presentation/features/admin/leads/lead-filters";

export interface LeadTableRow {
  lead: Lead;
  /** PageSpeed performance score for the lead's latest analysis, if any. */
  score?: number;
}

interface LeadTableProps {
  rows: LeadTableRow[];
  /** Rendered as a full-width row in the tbody when `rows` is empty, so the
   *  sticky column header stays mounted and visible in every data state. */
  emptyRow?: React.ReactNode;
}

interface DetailTarget {
  leadId: string;
  companyName: string;
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  analyzed:
    "text-accent-cyan border-[color-mix(in_oklab,var(--color-accent-cyan)_45%,var(--border))]",
  qualified:
    "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  discarded:
    "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]",
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "nuovo",
  analyzed: "analizzato",
  qualified: "qualificato",
  discarded: "scartato",
};

// Outreach badges follow the same pure-text + border-color pattern as the
// qualification `STATUS_STYLE` above: no icon, no emoji, color alone carries
// the semantic weight.
const OUTREACH_STYLE: Record<LeadOutreachStatus, string> = {
  not_contacted:
    "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  audit_sent:
    "text-accent-iris border-[color-mix(in_oklab,var(--color-accent-iris)_45%,var(--border))]",
  in_talks:
    "text-accent-amber border-[color-mix(in_oklab,var(--color-accent-amber)_45%,var(--border))]",
  closed_won:
    "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  rejected:
    "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]",
};

const OUTREACH_LABEL: Record<LeadOutreachStatus, string> = {
  not_contacted: "Da contattare",
  audit_sent: "Audit inviato",
  in_talks: "In trattativa",
  closed_won: "Cliente",
  rejected: "Rifiutato",
};

const MAX_VISIBLE_TECH = 3;

// Sticky is applied per-cell (not on <thead>) because position: sticky on a
// table-header-group element is unreliable across browsers when nested in
// scroll containers. Each <th> carries its own sticky offset instead.
const STICKY_HEAD_CLASS = "sticky top-0 z-10 border-b border-border bg-surface";

function SortableHeader({
  column,
  label,
  className,
  currentSort,
  params,
}: {
  column: string;
  label: string;
  className?: string;
  currentSort: SortOption;
  params: URLSearchParams;
}) {
  const newSort = toggleColumnSort(column, currentSort);
  if (!newSort)
    return (
      <TableHead className={cn(STICKY_HEAD_CLASS, className)}>{label}</TableHead>
    );

  const [field] = newSort.split("-");
  const isActive = currentSort.startsWith(field);
  const isAsc = currentSort.endsWith("asc");
  const href = `/admin/leads?${new URLSearchParams({
    ...Object.fromEntries(params),
    sort: newSort,
    page: "1",
  }).toString()}`;

  return (
    <TableHead className={cn(STICKY_HEAD_CLASS, className)}>
      <Link
        href={href}
        className={cn(
          "group inline-flex items-center gap-1.5 select-none -my-2 py-2 rounded transition-colors",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "text-accent"
        )}
      >
        <span className="truncate">{label}</span>
        <span
          className={cn(
            "flex-none opacity-0 transition-opacity text-accent",
            isActive && "opacity-100"
          )}
        >
          {isAsc ? (
            <ArrowUp className="size-3" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="size-3" strokeWidth={2.5} />
          )}
        </span>
      </Link>
    </TableHead>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-[0.08em] uppercase leading-none rounded-full px-2.5 py-[5px] border",
        STATUS_STYLE[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function LeadOutreachBadge({ status }: { status: LeadOutreachStatus }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-[0.08em] uppercase leading-none rounded-full px-2.5 py-[5px] border",
        OUTREACH_STYLE[status]
      )}
    >
      {OUTREACH_LABEL[status]}
    </span>
  );
}

function TechStackCell({ techStack }: { techStack: readonly string[] }) {
  if (!techStack || techStack.length === 0) {
    return <span className="font-mono text-[11px] text-muted-foreground/40">—</span>;
  }

  const visible = techStack.slice(0, MAX_VISIBLE_TECH);
  const hidden = techStack.slice(MAX_VISIBLE_TECH);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 min-w-0 max-w-full">
        {visible.map((tech) => (
          <span
            key={tech}
            className="font-mono text-[10.5px] text-soft border border-border rounded px-1.5 py-[1px] truncate"
            title={tech}
          >
            {tech}
          </span>
        ))}
        {hidden.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-[10.5px] text-muted border border-border rounded px-1.5 py-[1px] cursor-default">
                +{hidden.length}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {hidden.join(" · ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

function CopyrightCell({ copyright }: { copyright: string | undefined }) {
  if (!copyright) {
    return <span className="font-mono text-[11px] text-muted-foreground/40">—</span>;
  }

  // The column shows only the year — the staleness signal. Footer blocks that
  // carry no parsable year are omitted from the cell to keep the row compact;
  // the full line stays available on hover.
  const year = extractCopyrightYear(copyright);

  return (
    <div className="min-w-0 max-w-full">
      <span
        className="block font-mono text-[10.5px] truncate text-soft"
        title={copyright}
      >
        {year ?? <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

/**
 * Dense enterprise data table of leads. One lead per row; the row's action
 * cell slides an icon cluster in (quotas pattern) to open the detail Sheet or
 * delete the lead, keeping the list context visible under the sheet.
 */
export function LeadTable({ rows, emptyRow }: LeadTableProps) {
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const searchParams = useSearchParams();
  const currentSort = parseSortOption(searchParams.get("sort") ?? undefined);

  return (
    <>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHeader
                column="company"
                label="Azienda / Dominio"
                className="w-[25%]"
                currentSort={currentSort}
                params={searchParams}
              />
              <SortableHeader
                column="city"
                label="Città"
                className="w-[8%]"
                currentSort={currentSort}
                params={searchParams}
              />
              <TableHead className={cn(STICKY_HEAD_CLASS, "w-[20%]")}>Tech Stack</TableHead>
              <TableHead className={cn(STICKY_HEAD_CLASS, "w-[7%]")}>Ads</TableHead>
              <TableHead className={cn(STICKY_HEAD_CLASS, "w-[8%] overflow-hidden")}>
                <span className="block truncate">Copyright</span>
              </TableHead>
              <SortableHeader
                column="score"
                label="PageSpeed"
                className="w-[7%]"
                currentSort={currentSort}
                params={searchParams}
              />
              <SortableHeader
                column="status"
                label="Stato"
                className="w-[9%]"
                currentSort={currentSort}
                params={searchParams}
              />
              <TableHead className={cn(STICKY_HEAD_CLASS, "w-[9%]")}>Outreach</TableHead>
              <TableHead className={cn(STICKY_HEAD_CLASS, "w-[7%] text-right")}>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ lead, score }) => (
              <TableRow key={lead.id} className="group last:border-0">
                <TableCell className="overflow-hidden">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-space text-[13.5px] font-semibold text-foreground truncate">
                      {lead.companyName}
                    </span>
                    {lead.website && (
                      <span className="font-mono text-[11px] text-dim truncate">
                        {lead.website.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block font-hanken text-[13px] text-soft truncate">
                    {lead.city ?? <span className="text-muted-foreground/40">—</span>}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <TechStackCell techStack={lead.techStack ?? []} />
                </TableCell>
                <TableCell className="overflow-hidden">
                  <LeadAdsBadge adsTrackers={lead.adsTrackers ?? []} />
                </TableCell>
                <TableCell className="overflow-hidden">
                  <CopyrightCell copyright={lead.copyright} />
                </TableCell>
                <TableCell className="text-center">
                  <LeadScoreBadge score={score} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  <LeadOutreachBadge status={lead.outreachStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <LeadRowActions
                    id={lead.id}
                    companyName={lead.companyName}
                    status={lead.status}
                    onOpenDetail={(id, name) =>
                      setDetail({ leadId: id, companyName: name })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="p-0">
                  {emptyRow}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LeadDetailSheet
        key={detail?.leadId ?? "closed"}
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        leadId={detail?.leadId ?? ""}
        leadCompanyName={detail?.companyName ?? ""}
      />
    </>
  );
}