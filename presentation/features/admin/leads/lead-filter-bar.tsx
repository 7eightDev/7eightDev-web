"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/presentation/components/ui/button";
import { LeadJobToolbarActions } from "@/presentation/features/admin/leads/lead-job-toolbar-actions";
import { cn } from "@/presentation/lib/utils";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import {
  DEFAULT_LEAD_STATUS_FILTER,
  DEFAULT_SCORE_FILTER,
  DEFAULT_SOURCE_FILTER,
  LEAD_STATUS_FILTER_LABEL,
  SCORE_FILTER_LABEL,
  SOURCE_FILTER_LABEL,
  type LeadStatusFilter,
  type ScoreFilter,
  type SourceFilter,
} from "@/presentation/features/admin/leads/lead-filters";

/** Serializable shape of a job passed down from the server page. */
export interface ToolbarJob {
  id: string;
  query: string;
  location: string;
  status: LeadGenerationJob["status"];
  totalFound: number;
  analyzed: number;
  qualified: number;
  favorite: boolean;
}

interface LeadFilterBarProps {
  status: LeadStatusFilter;
  score: ScoreFilter;
  source: SourceFilter;
  q: string;
  jobs: ToolbarJob[];
  activeJobId: string | undefined;
}

const ALL_STATUSES: LeadStatusFilter[] = [
  "all",
  "new",
  "analyzed",
  "qualified",
  "discarded",
];

const selectBase =
  "h-9 w-fit items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 font-mono text-[12.5px] text-soft cursor-pointer transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const selectActive = "text-accent border-accent bg-accent/[0.06]";

const inputBase =
  "h-9 rounded-lg border border-border bg-surface px-3 font-hanken text-[13px] text-foreground placeholder:text-dim outline-none transition-colors focus:border-accent min-w-[180px]";

const JOB_LABEL: Record<LeadGenerationJob["status"], string> = {
  pending: "in coda",
  running: "in corso",
  completed: "completato",
  failed: "fallito",
};

function jobOptionLabel(job: ToolbarJob) {
  const location = job.location ? ` (${job.location})` : "";
  return `${job.query}${location} · ${job.totalFound} trovati · ${JOB_LABEL[job.status]}${job.favorite ? " ★" : ""}`;
}

/**
 * Unified sticky filter toolbar for the leads data table. One horizontal band:
 * search + job selector on the left, status segmented control in the middle,
 * global actions on the right. Secondary filters (score/source/sort) sit on a
 * quieter second row. All state lives in the URL so the page stays a Server
 * Component and views are shareable.
 */
export function LeadFilterBar({
  status,
  score,
  source,
  q,
  jobs,
  activeJobId,
}: LeadFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(q);

  const push = useCallback(
    (patch: Record<string, string>, deletes: string[] = []) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of deletes) params.delete(key);
      for (const [key, value] of Object.entries(patch)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [router, pathname, searchParams]
  );

  const searchQ = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      push(trimmed ? { q: trimmed } : { q: "" });
    },
    [push]
  );

  // Debounced live search: filters apply as you type, no Enter needed.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTyping = useRef(false);
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);
  const setDraftQDebounced = (value: string) => {
    isTyping.current = true;
    setDraftQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      isTyping.current = false;
      searchQ(value);
    }, 350);
  };

  // Keep the field in sync with the URL on back/forward navigation.
  useEffect(() => {
    if (!isTyping.current) setDraftQ(q);
  }, [q]);

  const setStatus = (value: LeadStatusFilter) =>
    push(
      value === DEFAULT_LEAD_STATUS_FILTER ? { status: "" } : { status: value }
    );
  const setScore = (value: ScoreFilter) =>
    push(value === DEFAULT_SCORE_FILTER ? { score: "" } : { score: value });
  const setSource = (value: SourceFilter) =>
    push(
      value === DEFAULT_SOURCE_FILTER ? { source: "" } : { source: value }
    );
  const setJob = (value: string) =>
    push(value === "all" ? { job: "" } : { job: value });

  const clearAll = () =>
    push({ status: "", score: "", source: "", q: "" });

  const clearSearch = () => {
    setDraftQ("");
    clearTimeout(timer.current);
    searchQ("");
  };

  const hasActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    q !== "";

  const funnelActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    q !== "";

  const qActive = q !== "";
  const scoreActive = score !== DEFAULT_SCORE_FILTER;
  const sourceActive = source !== DEFAULT_SOURCE_FILTER;

  const activeJob = jobs.find((job) => job.id === activeJobId);

  // Pinned searches first, then newest first.
  const sortedJobs = [...jobs].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) {
      return Boolean(a.favorite) ? -1 : 1;
    }
    return b.id.localeCompare(a.id);
  });

  return (
    <div
      role="toolbar"
      aria-label="Filtri lead"
      data-pending={isPending ? "" : undefined}
      className="sticky top-16 z-30 -mx-8 px-8 py-3 flex flex-col gap-3 border-b border-border bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] transition-opacity data-[pending]:opacity-60"
    >
      {/* Row 1: search + job | status | actions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQDebounced(e.target.value)}
            placeholder="Cerca lead…"
            aria-label="Cerca lead"
            className={cn(
              "w-44 sm:w-56",
              inputBase,
              qActive && "border-accent"
            )}
          />
          {draftQ && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Cancella ricerca"
              className="h-8 w-8 shrink-0 rounded-lg font-mono text-[13px] text-soft hover:text-foreground transition-colors cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {jobs.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={activeJobId ?? "all"}
              onChange={(e) => setJob(e.target.value)}
              aria-label="Filtra per ricerca"
              className={cn(selectBase, "max-w-[300px]")}
            >
              <option value="all">
                Tutte le ricerche · {jobs.length}
              </option>
              {sortedJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {jobOptionLabel(job)}
                </option>
              ))}
            </select>
            <LeadJobToolbarActions
              job={activeJob}
              disabled={!activeJob}
            />
          </div>
        )}

        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1"
          role="group"
          aria-label="Filtro per stato"
        >
          {ALL_STATUSES.map((value) => {
            const active = status === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={active}
                title={LEAD_STATUS_FILTER_LABEL[value]}
                className={cn(
                  "font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer",
                  active
                    ? "text-accent border-accent bg-accent/[0.08]"
                    : "text-soft border-transparent hover:text-foreground"
                )}
              >
                {LEAD_STATUS_FILTER_LABEL[value]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/leads/export">Esporta CSV</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/leads/new">+ Nuova ricerca</Link>
          </Button>
        </div>
      </div>

      {/* Row 2: secondary filters (quiet row, keeps the primary band clean) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted transition-colors",
              scoreActive && "text-accent"
            )}
          >
            Score
          </span>
          <select
            value={score}
            onChange={(e) => setScore(e.target.value as ScoreFilter)}
            className={cn(selectBase, scoreActive && selectActive)}
            aria-label="Filtro per score"
          >
            {(Object.keys(SCORE_FILTER_LABEL) as ScoreFilter[]).map((value) => (
              <option key={value} value={value}>
                {SCORE_FILTER_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted transition-colors",
              sourceActive && "text-accent"
            )}
          >
            Sorgente
          </span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceFilter)}
            className={cn(selectBase, sourceActive && selectActive)}
            aria-label="Filtro per sorgente"
          >
            {(Object.keys(SOURCE_FILTER_LABEL) as SourceFilter[]).map(
              (value) => (
                <option key={value} value={value}>
                  {SOURCE_FILTER_LABEL[value]}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={clearAll}
          disabled={!hasActive}
          aria-label="Azzera filtri"
          aria-pressed={funnelActive}
          title="Azzera filtri"
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-150 cursor-pointer",
            funnelActive
              ? "text-accent border-accent bg-accent/[0.08] hover:brightness-110"
              : "text-soft border-soft opacity-90"
          )}
        >
          <svg
            width="13.5"
            height="13.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            {funnelActive && <line x1="4.5" y1="5" x2="19.5" y2="20" />}
          </svg>
        </button>
      </div>
    </div>
  );
}