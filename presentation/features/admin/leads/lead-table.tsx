"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Chat01Icon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleXIcon,
  Mail01Icon,
  MailSend01Icon,
  Medal01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
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
import { LeadDetailDialog } from "@/presentation/features/admin/leads/lead-detail-dialog";
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

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]",
  analyzed:
    "text-accent-cyan border-[color-mix(in_oklab,var(--color-accent-cyan)_45%,var(--border))]",
  qualified:
    "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]",
  discarded:
    "text-[var(--coral-text)] border-[color-mix(in_oklab,var(--coral-text)_45%,var(--border))]",
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "nuovo",
  analyzed: "analizzato",
  qualified: "qualificato",
  discarded: "scartato",
};

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
    "text-[var(--coral-text)] border-[color-mix(in_oklab,var(--coral-text)_45%,var(--border))]",
};

const OUTREACH_LABEL: Record<LeadOutreachStatus, string> = {
  not_contacted: "Da contattare",
  audit_sent: "Audit inviato",
  in_talks: "In trattativa",
  closed_won: "Cliente",
  rejected: "Rifiutato",
};

// Mobile-only compact indicators: the same state semantics as the desktop
// badges, but rendered as a single colored icon instead of a text pill.
const STATUS_ICON: Record<LeadStatus, IconSvgElement> = {
  new: CircleDotIcon,
  analyzed: Search01Icon,
  qualified: CircleCheckIcon,
  discarded: CircleXIcon,
};

const STATUS_ICON_CLASS: Record<LeadStatus, string> = {
  new: "text-muted",
  analyzed: "text-accent-cyan",
  qualified: "text-accent",
  discarded: "text-[var(--coral-text)]",
};

const OUTREACH_ICON: Record<LeadOutreachStatus, IconSvgElement> = {
  not_contacted: Mail01Icon,
  audit_sent: MailSend01Icon,
  in_talks: Chat01Icon,
  closed_won: Medal01Icon,
  rejected: CircleXIcon,
};

const OUTREACH_ICON_CLASS: Record<LeadOutreachStatus, string> = {
  not_contacted: "text-muted",
  audit_sent: "text-accent-iris",
  in_talks: "text-accent-amber",
  closed_won: "text-accent",
  rejected: "text-[var(--coral-text)]",
};

function StatusIcon({ status }: { status: LeadStatus }) {
  return (
    <span
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
      className="inline-flex shrink-0 items-center justify-center size-7 rounded-full border border-border/60 bg-raised"
    >
      <HugeiconsIcon
        icon={STATUS_ICON[status]}
        size={14}
        aria-hidden
        className={STATUS_ICON_CLASS[status]}
      />
    </span>
  );
}

function OutreachStatusIcon({ status }: { status: LeadOutreachStatus }) {
  return (
    <span
      title={OUTREACH_LABEL[status]}
      aria-label={OUTREACH_LABEL[status]}
      className="inline-flex shrink-0 items-center justify-center size-7 rounded-full border border-border/60 bg-raised"
    >
      <HugeiconsIcon
        icon={OUTREACH_ICON[status]}
        size={14}
        aria-hidden
        className={OUTREACH_ICON_CLASS[status]}
      />
    </span>
  );
}

const MAX_VISIBLE_TECH = 3;

// Sticky column header must sit above every row control (favorite star and
// the "…" toggle are z-20, the slide-in action cluster z-10), so scrolled
// rows paint underneath it instead of poking through.
const STICKY_HEAD_CLASS = "sticky top-0 z-30 border-b border-border bg-surface";

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
    return <span className="font-mono text-[11px] text-muted-foreground/40">&mdash;</span>;
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
              {hidden.join(" &middot; ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

function CopyrightCell({ copyright }: { copyright: string | undefined }) {
  if (!copyright) {
    return <span className="font-mono text-[11px] text-muted-foreground/40">&mdash;</span>;
  }

  const year = extractCopyrightYear(copyright);

  return (
    <div className="min-w-0 max-w-full">
      <span
        className="block font-mono text-[10.5px] truncate text-soft"
        title={copyright}
      >
        {year ?? <span className="text-muted-foreground/40">&mdash;</span>}
      </span>
    </div>
  );
}

/**
 * Dense enterprise data table of leads. One lead per row; the row's action
 * cell navigates to the full-page detail or allows quick actions.
 *
 * On mobile (<820px) the table is replaced by a stacked card grid following
 * the same pattern used on the quotes list page.
 */
export function LeadTable({ rows, emptyRow }: LeadTableProps) {
  const searchParams = useSearchParams();
  const currentSort = parseSortOption(searchParams.get("sort") ?? undefined);
  const [selected, setSelected] = useState<LeadTableRow | null>(null);

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface">
      {/* Desktop: fixed-width table */}
      <Table className="max-[820px]:hidden">
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
              label="Citt&agrave;"
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
            <TableRow
              key={lead.id}
              onClick={() => setSelected({ lead, score })}
              className="group last:border-0 cursor-pointer transition-colors hover:bg-foreground/[0.04]"
            >
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
                  {lead.city ?? <span className="text-muted-foreground/40">&mdash;</span>}
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
                  favorite={lead.favorite ?? false}
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

      {/* Mobile: compact stacked cards. Only the client name + status, score
          and outreach survive; status/outreach degrade to icon-only chips. */}
      <div className="hidden max-[820px]:grid gap-0">
        {rows.map(({ lead, score }) => (
          <div
            key={lead.id}
            onClick={() => setSelected({ lead, score })}
            className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 border-b border-border px-4 py-3.5 transition-colors hover:bg-foreground/[0.04] last:border-b-0 cursor-pointer"
          >
            {/* Row 1: Company name + Actions */}
            <div className="min-w-0">
              <span className="font-space text-[13.5px] font-semibold text-foreground block truncate">
                {lead.companyName}
              </span>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 justify-self-end"
            >
              <LeadRowActions
                id={lead.id}
                companyName={lead.companyName}
                status={lead.status}
                favorite={lead.favorite ?? false}
              />
            </div>

            {/* Row 2: Status | Score | Outreach (icon-only) */}
            <div className="col-span-2 flex items-center gap-2 min-w-0">
              <StatusIcon status={lead.status} />
              <LeadScoreBadge score={score} />
              <OutreachStatusIcon status={lead.outreachStatus} />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-10">{emptyRow}</div>
        )}
      </div>

      {selected && (
        <LeadDetailDialog
          leadId={selected.lead.id}
          leadCompanyName={selected.lead.companyName}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </div>
  );
}
