"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import { Button } from "@/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/ui/popover";
import { LeadJobDrawer } from "@/presentation/features/admin/leads/lead-job-drawer";
import { cn } from "@/presentation/lib/utils";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import {
  DEFAULT_LEAD_STATUS_FILTER,
  DEFAULT_SCORE_FILTER,
  DEFAULT_SOURCE_FILTER,
  DEFAULT_COPYRIGHT_FILTER,
  LEAD_STATUS_FILTER_LABEL,
  SCORE_FILTER_LABEL,
  SOURCE_FILTER_LABEL,
  serializeTechStackFilter,
  type LeadStatusFilter,
  type ScoreFilter,
  type SourceFilter,
  type TechStackFilter,
  type CopyrightFilter,
} from "@/presentation/features/admin/leads/lead-filters";

/** Serializable shape of a job passed down from the server page. Structurally
 *  assignable to `LeadGenerationJob` so the drawer can reuse `LeadJobStatus`. */
export interface ToolbarJob {
  id: string;
  query: string;
  location: string;
  status: LeadGenerationJob["status"];
  totalFound: number;
  analyzed: number;
  qualified: number;
  favorite: boolean;
  error?: string;
  createdAt: string;
}

interface LeadFilterBarProps {
  status: LeadStatusFilter;
  score: ScoreFilter;
  source: SourceFilter;
  q: string;
  jobs: ToolbarJob[];
  activeJobId: string | undefined;
  techStack: TechStackFilter;
  copyright: CopyrightFilter;
  availableTechStacks: string[];
  availableCopyrights: string[];
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

/**
 * Two-tier sticky leads toolbar. Row 1 is the action header (title + job
 * selector + global actions); row 2 is the operational filter band (live
 * search, status segmented control, advanced filters behind a popover). All
 * state lives in the URL so the page stays a Server Component.
 */
export function LeadFilterBar({
  status,
  score,
  source,
  q,
  jobs,
  activeJobId,
  techStack,
  copyright,
  availableTechStacks,
  availableCopyrights,
}: LeadFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(q);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);

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
  const setTechStack = (value: TechStackFilter) =>
    push(
      value.length === 0
        ? { tech: "" }
        : { tech: serializeTechStackFilter(value) }
    );
  const setCopyright = (value: CopyrightFilter) =>
    push(
      value === DEFAULT_COPYRIGHT_FILTER ? { copyright: "" } : { copyright: value }
    );

  const clearAll = () =>
    push({ status: "", score: "", source: "", q: "", tech: "", copyright: "" });

  const clearSearch = () => {
    setDraftQ("");
    clearTimeout(timer.current);
    searchQ("");
  };

  const hasActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    techStack.length > 0 ||
    copyright !== DEFAULT_COPYRIGHT_FILTER ||
    q !== "";

  const qActive = q !== "";
  const scoreActive = score !== DEFAULT_SCORE_FILTER;
  const sourceActive = source !== DEFAULT_SOURCE_FILTER;
  const techStackActive = techStack.length > 0;
  const copyrightActive = copyright !== DEFAULT_COPYRIGHT_FILTER;
  // Hidden filters live in the popover: badge shows how many are active.
  const advancedActive =
    (scoreActive ? 1 : 0) +
    (sourceActive ? 1 : 0) +
    (techStackActive ? 1 : 0) +
    (copyrightActive ? 1 : 0);

  const activeJob = jobs.find((job) => job.id === activeJobId);

  // The CSV export mirrors the current filter context (job, status, source,
  // free-text), forwarding the same params the server page reads.
  const exportHref = useMemo(() => {
    const keep = ["status", "source", "q", "job", "tech", "copyright"];
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [...params.keys()]) {
      if (!keep.includes(key)) params.delete(key);
    }
    const query = params.toString();
    return query ? `/admin/leads/export?${query}` : "/admin/leads/export";
  }, [searchParams]);

  return (
    <>
      <div
        role="toolbar"
        aria-label="Filtri lead"
        data-pending={isPending ? "" : undefined}
        className="-mx-8 px-8 pt-8 pb-6 flex flex-col gap-3 border-b border-border transition-opacity data-[pending]:opacity-60"
      >
      {/* Row 1: action header (title + job selector | global actions) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground m-0 shrink-0">
          Lead
        </h1>

        <div className="flex items-center gap-2 ml-auto">
          {jobs.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setJobDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={jobDrawerOpen}
              title={
                activeJob
                  ? `${activeJob.query}${activeJob.location ? ` (${activeJob.location})` : ""}`
                  : "Tutte le ricerche"
              }
              className={cn(
                "cursor-pointer max-w-[300px] font-mono text-[12.5px]",
                jobDrawerOpen && "border-accent text-accent bg-accent/[0.06]"
              )}
            >
              <span className="flex-1 min-w-0 truncate">
                {activeJob
                  ? activeJob.query
                  : "Tutte le ricerche"}
              </span>
              <span className="shrink-0 text-muted">
                ({activeJob ? activeJob.totalFound : jobs.length})
              </span>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={exportHref}>Esporta CSV</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="border-accent text-accent hover:bg-accent/[0.08] hover:text-accent"
          >
            <Link href="/admin/leads/new">+ Nuova ricerca</Link>
          </Button>
        </div>
      </div>

      {/* Row 2: operational filter band (search | status | advanced filters) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

        <ToggleGroup
          type="single"
          value={status}
          onValueChange={(v) => v && setStatus(v as LeadStatusFilter)}
          aria-label="Filtro per stato"
          className="h-9 rounded-lg border border-border bg-surface p-0.5"
        >
          {ALL_STATUSES.map((value) => (
            <ToggleGroupItem
              key={value}
              value={value}
              title={LEAD_STATUS_FILTER_LABEL[value]}
              className={cn(
                "h-full font-mono text-[11px] px-2.5 rounded-md transition-colors",
                "data-[state=on]:text-accent data-[state=on]:bg-accent/[0.08]",
                "data-[state=off]:text-soft data-[state=off]:hover:text-foreground"
              )}
            >
              {LEAD_STATUS_FILTER_LABEL[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Azzera filtri"
            title="Azzera filtri"
            className={cn(
              "inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-surface px-3 font-mono text-[12.5px] transition-colors duration-150 cursor-pointer",
              "text-accent border-accent bg-accent/[0.08] hover:brightness-110"
            )}
          >
            Azzera filtri
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filtri avanzati"
                aria-pressed={advancedActive > 0}
                title="Filtri avanzati"
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-surface px-3 font-mono text-[12.5px] transition-colors duration-150 cursor-pointer",
                  advancedActive > 0
                    ? "text-accent border-accent bg-accent/[0.06]"
                    : "text-soft hover:text-foreground"
                )}
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} size={14} aria-hidden />
                Filtri avanzati
                {advancedActive > 0 && (
                  <span className="font-mono text-[10px] leading-none px-1.5 py-[3px] rounded-full bg-accent text-[#0a0b0d] font-bold">
                    {advancedActive}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2.5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Score
                  </span>
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value as ScoreFilter)}
                    className={cn(
                      selectBase,
                      "w-full",
                      scoreActive && selectActive
                    )}
                    aria-label="Filtro per score"
                  >
                    {(Object.keys(SCORE_FILTER_LABEL) as ScoreFilter[]).map(
                      (value) => (
                        <option key={value} value={value}>
                          {SCORE_FILTER_LABEL[value]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Sorgente
                  </span>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as SourceFilter)}
                    className={cn(
                      selectBase,
                      "w-full",
                      sourceActive && selectActive
                    )}
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

                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Tech Stack
                  </span>
                  <TechStackMultiselect
                    value={techStack}
                    onChange={setTechStack}
                    options={availableTechStacks}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    Copyright
                  </span>
                  <select
                    value={copyright}
                    onChange={(e) => setCopyright(e.target.value)}
                    className={cn(
                      selectBase,
                      "w-full",
                      copyrightActive && selectActive
                    )}
                    aria-label="Filtro per copyright"
                  >
                    <option value="">tutti</option>
                    {availableCopyrights.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      </div>

      <LeadJobDrawer
        open={jobDrawerOpen}
        onOpenChange={setJobDrawerOpen}
        jobs={jobs}
        activeJobId={activeJobId}
      />
    </>
  );
}

interface TechStackMultiselectProps {
  value: TechStackFilter;
  onChange: (value: TechStackFilter) => void;
  options: string[];
}

/** Multi-select checkbox list for tech-stack filtering. */
function TechStackMultiselect({
  value,
  onChange,
  options,
}: TechStackMultiselectProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {options.length === 0 ? (
        <span className="font-mono text-[11px] text-dim">
          Nessun tech rilevato
        </span>
      ) : (
        <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border p-1">
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                aria-pressed={checked}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[12px] transition-colors cursor-pointer",
                  checked
                    ? "text-accent bg-accent/[0.08]"
                    : "text-soft hover:text-foreground hover:bg-surface"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-accent bg-accent text-[#0a0b0d]"
                      : "border-border"
                  )}
                >
                  {checked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}