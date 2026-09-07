"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/presentation/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import { LeadJobStatus } from "@/presentation/features/admin/leads/lead-job-status";
import { cn } from "@/presentation/lib/utils";
import type { ToolbarJob } from "@/presentation/features/admin/leads/lead-filter-bar";

interface LeadJobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: ToolbarJob[];
  activeJobId: string | undefined;
}

/**
 * Left slide-over drawer listing the recent searches (jobs). Mirrors the lead
 * detail Sheet on the right: left = context/history, center = data, right =
 * focus. Every job server action revalidates /admin/leads, so the drawer
 * stays in sync as jobs are flagged/deleted/rerun.
 */
export function LeadJobDrawer({
  open,
  onOpenChange,
  jobs,
  activeJobId,
}: LeadJobDrawerProps) {
  // Pinned searches first, then newest first (id embeds a timestamp).
  const sortedJobs = [...jobs].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) {
      return Boolean(a.favorite) ? -1 : 1;
    }
    return b.id.localeCompare(a.id);
  });

  const allActive = !activeJobId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[340px] max-w-[85vw] gap-0 p-0"
      >
        <SheetHeader className="gap-3 px-5 pt-6 pb-1">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={FolderOpenIcon}
              size={18}
              aria-hidden
              className="shrink-0 text-muted"
            />
            <SheetTitle className="font-space text-base font-semibold m-0">
              Ricerche
            </SheetTitle>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground m-0">
            Ogni ricerca è una sessione di scraping. Scegline una per filtrare
            i lead a schermo.
          </p>
          <Button asChild size="sm" className="mt-1 w-full">
            <Link href="/admin/leads/new">+ Nuova ricerca</Link>
          </Button>
        </SheetHeader>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto no-scrollbar px-4 pb-6">
          <Link
            href="/admin/leads"
            onClick={() => onOpenChange(false)}
            aria-current={allActive ? "page" : undefined}
            className={cn(
              "flex items-center justify-between h-9 shrink-0 rounded-lg border px-3 font-mono text-[12.5px] transition-colors",
              allActive
                ? "border-accent bg-accent/[0.06] text-accent"
                : "border-border text-soft hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:text-foreground"
            )}
          >
            <span className="truncate">Tutte le ricerche</span>
            <span className="shrink-0 text-muted">({jobs.length})</span>
          </Link>

          {sortedJobs.map((job) => (
            <LeadJobStatus
              key={job.id}
              job={job}
              active={job.id === activeJobId}
              foundCount={job.totalFound}
              onSelect={() => onOpenChange(false)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}