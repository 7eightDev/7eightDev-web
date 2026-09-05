'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/presentation/lib/utils';
import {
  DEFAULT_LEAD_STATUS_FILTER,
  DEFAULT_SCORE_FILTER,
  DEFAULT_SORT,
  DEFAULT_SOURCE_FILTER,
  LEAD_STATUS_FILTER_LABEL,
  SCORE_FILTER_LABEL,
  SORT_LABEL,
  SOURCE_FILTER_LABEL,
  type LeadStatusFilter,
  type ScoreFilter,
  type SortOption,
  type SourceFilter,
} from '@/presentation/features/admin/leads/lead-filters';

interface LeadFilterBarProps {
  status: LeadStatusFilter;
  score: ScoreFilter;
  source: SourceFilter;
  q: string;
  sort: SortOption;
}

const ALL_STATUSES: LeadStatusFilter[] = [
  'all',
  'new',
  'analyzed',
  'qualified',
  'discarded',
];

const selectBase =
  'h-9 w-fit items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 font-mono text-[12.5px] text-soft cursor-pointer transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const inputBase =
  'h-9 rounded-lg border border-border bg-surface px-3 font-hanken text-[13px] text-foreground placeholder:text-dim outline-none transition-colors focus:border-accent min-w-[180px]';

/**
 * Filter controls for the leads list. Active filters live in the URL
 * (?status=&score=&source=&q=&sort=) so the page stays a Server Component and
 * the view is shareable. This component only translates control changes into
 * the URL.
 */
export function LeadFilterBar({
  status,
  score,
  source,
  q,
  sort,
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
      push(trimmed ? { q: trimmed } : { q: '' });
    },
    [push]
  );

  // Debounced live search: filters apply as you type, no Enter needed.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
  const isTyping = useRef(false);
  useEffect(() => {
    if (!isTyping.current) setDraftQ(q);
  }, [q]);

  const setStatus = (value: LeadStatusFilter) =>
    push(
      value === DEFAULT_LEAD_STATUS_FILTER
        ? { status: '' }
        : { status: value }
    );
  const setScore = (value: ScoreFilter) =>
    push(value === DEFAULT_SCORE_FILTER ? { score: '' } : { score: value });
  const setSource = (value: SourceFilter) =>
    push(
      value === DEFAULT_SOURCE_FILTER ? { source: '' } : { source: value }
    );
  const setSort = (value: SortOption) =>
    push(value === DEFAULT_SORT ? { sort: '' } : { sort: value });

  const clearAll = () => push({ status: '', score: '', source: '', q: '', sort: '' });
  const clearSearch = () => {
    setDraftQ('');
    clearTimeout(timer.current);
    searchQ('');
  };

  const hasActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    q !== '' ||
    sort !== DEFAULT_SORT;

  // L'imbuto si illumina ogni volta che è applicato un filtro: dai pill di
  // stato (analizzati, qualificati…), dalle scelte nei moduli (score,
  // sorgente), o da un testo nella barra di ricerca. "Ordina" esclude: riordina
  // la vista ma non restringe l'elenco. L'imbuto si spegne solo quando tutto è
  // ai valori di default (stato "tutti" incluso).
  const funnelActive =
    status !== DEFAULT_LEAD_STATUS_FILTER ||
    score !== DEFAULT_SCORE_FILTER ||
    source !== DEFAULT_SOURCE_FILTER ||
    q !== '';

  // Ogni modulo si illumina quando il suo filtro è attivo, come l'imbuto.
  const qActive = q !== '';
  const scoreActive = score !== DEFAULT_SCORE_FILTER;
  const sourceActive = source !== DEFAULT_SOURCE_FILTER;
  const sortActive = sort !== DEFAULT_SORT;

  const moduleLabel =
    'font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition-colors';
  const moduleLabelActive = 'text-accent';
  const selectActive = 'text-accent border-accent bg-accent/[0.06]';

  return (
    <div
      role="toolbar"
      aria-label="Filtri lead"
      data-pending={isPending ? '' : undefined}
      className="flex flex-col gap-7 border-b border-border pb-8 mb-5 data-[pending]:opacity-60 transition-opacity"
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center justify-center flex-1 gap-2">
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
                'font-mono text-[12px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer',
                active
                  ? 'text-accent border-accent bg-accent/[0.08]'
                  : 'text-soft border-border hover:text-foreground hover:border-[color-mix(in_oklab,var(--foreground)_25%,var(--border))]'
              )}
            >
              {LEAD_STATUS_FILTER_LABEL[value]}
            </button>
          );
        })}
        </div>

        <button
          type="button"
          onClick={clearAll}
          disabled={!hasActive}
          aria-label="Azzera filtri"
          aria-pressed={funnelActive}
          title="Azzera filtri"
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-150 ml-2 shrink-0 cursor-pointer",
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
            {funnelActive && (
              <line x1="4.5" y1="5" x2="19.5" y2="20" />
            )}
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span className={cn(moduleLabel, qActive && moduleLabelActive)}>
              Cerca
            </span>
            <span
              id="lead-search-hint"
              className="hidden sm:inline font-mono text-[11px] text-muted"
            >
              cerca mentre digiti
            </span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={draftQ}
              onChange={(e) => setDraftQDebounced(e.target.value)}
              placeholder="Cerca azienda, città, sito…"
              aria-label="Cerca lead"
              aria-describedby="lead-search-hint"
              className={cn(inputBase, 'min-w-[200px]', qActive && 'border-accent')}
            />
            {draftQ && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Cancella ricerca"
                className="font-mono text-[12px] px-2 py-1 rounded-md text-muted hover:text-foreground underline underline-offset-4"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={cn(moduleLabel, scoreActive && moduleLabelActive)}>
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

        <div className="flex flex-col gap-1.5">
          <span className={cn(moduleLabel, sourceActive && moduleLabelActive)}>
            Sorgente
          </span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceFilter)}
            className={cn(selectBase, sourceActive && selectActive)}
            aria-label="Filtro per sorgente"
          >
            {(Object.keys(SOURCE_FILTER_LABEL) as SourceFilter[]).map((value) => (
              <option key={value} value={value}>
                {SOURCE_FILTER_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={cn(moduleLabel, sortActive && moduleLabelActive)}>
            Ordina
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className={cn(selectBase, sortActive && selectActive)}
            aria-label="Ordinamento"
          >
            {(Object.keys(SORT_LABEL) as SortOption[]).map((value) => (
              <option key={value} value={value}>
                {SORT_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}
