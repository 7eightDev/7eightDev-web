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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import { Button } from "@/presentation/components/ui/button";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { LeadJobDrawer } from "@/presentation/features/admin/leads/lead-job-drawer";
import { cn } from "@/presentation/lib/utils";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import {
  ADS_FILTER_LABEL,
  DEFAULT_ADS_FILTER,
  DEFAULT_FAVORITE_FILTER,
  DEFAULT_LEAD_STATUS_FILTER,
  DEFAULT_OUTREACH_STATUS_FILTER,
  DEFAULT_SCORE_FILTER,
  DEFAULT_SOURCE_FILTER,
  LEAD_STATUS_FILTER_LABEL,
  OUTREACH_STATUS_FILTER_LABEL,
  SCORE_FILTER_LABEL,
  SOURCE_FILTER_LABEL,
  serializeTechStackFilter,
  type AdsFilter,
  type FavoriteFilter,
  type LeadStatusFilter,
  type OutreachStatusFilter,
  type ScoreFilter,
  type SourceFilter,
  type TechStackFilter,
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
  outreach: OutreachStatusFilter;
  favorite: FavoriteFilter;
  score: ScoreFilter;
  source: SourceFilter;
  ads: AdsFilter;
  q: string;
  jobs: ToolbarJob[];
  activeJobId: string | undefined;
  techStack: TechStackFilter;
  copyrightFrom: number | undefined;
  copyrightTo: number | undefined;
  availableTechStacks: string[];
  availableYears: number[];
}

const ALL_STATUSES: LeadStatusFilter[] = [
  "all",
  "new",
  "analyzed",
  "qualified",
  "discarded",
];

const ALL_OUTREACH_STATUSES: OutreachStatusFilter[] = [
  "all",
  "not_contacted",
  "audit_sent",
  "in_talks",
  "closed_won",
  "rejected",
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
  outreach,
  favorite,
  score,
  source,
  ads,
  q,
  jobs,
  activeJobId,
  techStack,
  copyrightFrom,
  copyrightTo,
  availableTechStacks,
  availableYears,
}: LeadFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(q);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelMotion = reduceMotion
    ? { initial: { height: "auto", opacity: 1 }, exit: { height: "auto", opacity: 1 } }
    : { initial: { height: 0, opacity: 0 }, exit: { height: 0, opacity: 0 } };

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
  const setOutreach = (value: OutreachStatusFilter) =>
    push(
      value === DEFAULT_OUTREACH_STATUS_FILTER
        ? { outreach: "" }
        : { outreach: value }
    );
  const setFavorite = () =>
    push(
      favorite === DEFAULT_FAVORITE_FILTER
        ? { favorite: "favorite" }
        : { favorite: "" }
    );
  const setScore = (value: ScoreFilter) =>
    push(value === DEFAULT_SCORE_FILTER ? { score: "" } : { score: value });
  const setSource = (value: SourceFilter) =>
    push(
      value === DEFAULT_SOURCE_FILTER ? { source: "" } : { source: value }
    );
  const setAds = (value: AdsFilter) =>
    push(value === DEFAULT_ADS_FILTER ? { ads: "" } : { ads: value });
  const setTechStack = (value: TechStackFilter) =>
    push(
      value.length === 0
        ? { tech: "" }
        : { tech: serializeTechStackFilter(value) }
    );
  const setCopyrightFrom = (value: string) =>
    push(value === "" ? { "year-from": "" } : { "year-from": value });
  const setCopyrightTo = (value: string) =>
    push(value === "" ? { "year-to": "" } : { "year-to": value });

  const clearAll = () =>
    push({
      status: "",
      outreach: "",
      favorite: "",
      score: "",
      source: "",
      ads: "",
      q: "",
      tech: "",
      "year-from": "",
      "year-to": "",
    });

  const clearSearch = () => {
    setDraftQ("");
    clearTimeout(timer.current);
    searchQ("");
  };

  const hasActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    outreach !== DEFAULT_OUTREACH_STATUS_FILTER ||
    favorite !== DEFAULT_FAVORITE_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    ads !== DEFAULT_ADS_FILTER ||
    techStack.length > 0 ||
    copyrightFrom !== undefined ||
    copyrightTo !== undefined ||
    q !== "";

  const qActive = q !== "";
  const scoreActive = score !== DEFAULT_SCORE_FILTER;
  const sourceActive = source !== DEFAULT_SOURCE_FILTER;
  const adsActive = ads !== DEFAULT_ADS_FILTER;
  const techStackActive = techStack.length > 0;
  const copyrightActive = copyrightFrom !== undefined || copyrightTo !== undefined;
  // Hidden filters live in the collapsible panel: the chevron turns accent
  // when any is active.
  const advancedActive =
    (scoreActive ? 1 : 0) +
    (sourceActive ? 1 : 0) +
    (adsActive ? 1 : 0) +
    (techStackActive ? 1 : 0) +
    (copyrightActive ? 1 : 0);

  const activeJob = jobs.find((job) => job.id === activeJobId);

  // The CSV export mirrors the current filter context (job, status, source,
  // free-text, tech, year range), forwarding the same params the server reads.
  const exportHref = useMemo(() => {
    const keep = [
      "status",
      "outreach",
      "favorite",
      "source",
      "ads",
      "q",
      "job",
      "tech",
      "year-from",
      "year-to",
    ];
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
        className="-mx-8 px-8 pt-8 flex flex-col gap-3 transition-opacity data-[pending]:opacity-60"
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
            className="rounded-full bg-accent text-[#0a0b0d] hover:brightness-105 hover:-translate-y-px hover:bg-accent"
          >
            <Link href="/admin/leads/new">+ Nuova ricerca</Link>
          </Button>
        </div>
      </div>

      {/* Row 2: operational filter band (search | status | clear) */}
      <div className="mx-auto mt-6 flex w-full max-w-[820px] flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQDebounced(e.target.value)}
            placeholder="Cerca lead…"
            aria-label="Cerca lead"
            className={cn(
              "w-56 min-w-0 flex-1 sm:flex-1",
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
      </div>

      {/* Quick outreach band: sales funnel stage filter */}
      <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Outreach
        </span>
        <ToggleGroup
          type="single"
          value={outreach}
          onValueChange={(v) => v && setOutreach(v as OutreachStatusFilter)}
          aria-label="Filtro per stato outreach"
          className="h-9 rounded-lg border border-border bg-surface p-0.5"
        >
          {ALL_OUTREACH_STATUSES.map((value) => (
            <ToggleGroupItem
              key={value}
              value={value}
              title={OUTREACH_STATUS_FILTER_LABEL[value]}
              className={cn(
                "h-full font-mono text-[11px] px-2.5 rounded-md transition-colors",
                "data-[state=on]:text-accent data-[state=on]:bg-accent/[0.08]",
                "data-[state=off]:text-soft data-[state=off]:hover:text-foreground"
              )}
            >
              {OUTREACH_STATUS_FILTER_LABEL[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <button
          type="button"
          onClick={setFavorite}
          aria-pressed={favorite === "favorite"}
          title="Solo lead preferiti (stella)"
          className={cn(
            "ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-mono text-[12.5px] transition-colors duration-150 cursor-pointer",
            favorite === "favorite"
              ? "border-accent-amber bg-accent-amber/10 text-accent-amber hover:brightness-110"
              : "border-border bg-surface text-soft hover:text-foreground hover:border-accent/40"
          )}
        >
          <HugeiconsIcon
            icon={StarIcon}
            size={14}
            aria-hidden
            className={cn(favorite === "favorite" && "fill-current")}
          />
          Preferiti
        </button>
      </div>

      {/* Advanced filters toggle: centered chevron on a divider line */}
      <div className="relative flex items-center my-3">
        <div className="flex-1 border-t border-border" />
        <button
          type="button"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          aria-expanded={advancedOpen}
          aria-label={advancedOpen ? "Chiudi filtri avanzati" : "Apri filtri avanzati"}
          className={cn(
            "mx-3 flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer",
            advancedActive > 0
              ? "border-accent bg-accent/[0.08] text-accent hover:bg-accent/[0.14]"
              : "border-border bg-surface text-soft hover:text-foreground hover:bg-accent/[0.06]"
          )}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            aria-hidden
            className={cn(
              "transition-transform duration-200",
              advancedOpen && "rotate-180"
            )}
          />
        </button>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Advanced filters panel (collapsible) */}
      <AnimatePresence initial={false}>
      {advancedOpen && (
        <motion.div
          key="advanced-filters-panel"
          className="overflow-hidden"
          initial={panelMotion.initial}
          animate={{ height: "auto", opacity: 1 }}
          exit={panelMotion.exit}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }
          }
        >
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
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

            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
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

            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                Inserzioni Ads
              </span>
              <select
                value={ads}
                onChange={(e) => setAds(e.target.value as AdsFilter)}
                className={cn(
                  selectBase,
                  "w-full",
                  adsActive && selectActive
                )}
                aria-label="Filtro per inserzioni ads"
              >
                {(Object.keys(ADS_FILTER_LABEL) as AdsFilter[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value === "with" ? "🟢 " : value === "without" ? "⚪ " : ""}
                      {ADS_FILTER_LABEL[value]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                Copyright
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={copyrightFrom ?? ""}
                  onChange={(e) => setCopyrightFrom(e.target.value)}
                  aria-label="Anno copyright minimo"
                  className={cn(
                    selectBase,
                    "flex-1 min-w-0",
                    copyrightActive && selectActive
                  )}
                >
                  <option value="">da</option>
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 font-mono text-[11px] text-muted">
                  –
                </span>
                <select
                  value={copyrightTo ?? ""}
                  onChange={(e) => setCopyrightTo(e.target.value)}
                  aria-label="Anno copyright massimo"
                  className={cn(
                    selectBase,
                    "flex-1 min-w-0",
                    copyrightActive && selectActive
                  )}
                >
                  <option value="">a</option>
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
        </div>
        </motion.div>
      )}
      </AnimatePresence>
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

/** Compact chip row for tech-stack filtering — one line of selectable pills. */
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
    <div className="flex flex-wrap items-center justify-between gap-1.5">
      {options.length === 0 ? (
        <span className="font-mono text-[11px] text-dim">
          Nessun tech rilevato
        </span>
      ) : (
        options.map((option) => {
          const checked = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={checked}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 rounded-full border px-2.5 font-mono text-[11.5px] transition-colors cursor-pointer",
                checked
                  ? "border-accent bg-accent/[0.08] text-accent"
                  : "border-border bg-surface text-soft hover:text-foreground hover:border-accent/40"
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
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="truncate">{option}</span>
            </button>
          );
        })
      )}
    </div>
  );
}