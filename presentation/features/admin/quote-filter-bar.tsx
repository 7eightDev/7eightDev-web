'use client';

import { useCallback, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AlarmClockIcon,
  Archive02Icon,
  CalendarRemove01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  FilterIcon,
  Menu01Icon,
  PencilEdit02Icon,
  SentIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DEFAULT_DUE_FILTER,
  DEFAULT_STATUS_FILTER,
  STATUS_FILTER_LABEL,
  type DueFilter,
  type StatusFilter,
} from '@/presentation/features/admin/quote-filters';

interface QuoteFilterBarProps {
  status: StatusFilter;
  due: DueFilter;
  /** Whether the archived-only view is active. */
  archived: boolean;
  /** How many quotes are archived (badge on the toggle); hides it when 0. */
  archivedCount: number;
}

type FilterKey = 'status' | 'due' | 'archived';

/**
 * Filters grouped by priority. The pipeline is the day-to-day funnel and stays
 * visible; closed states and the orthogonal refinements (expiring date,
 * archived view) are secondary — shown inline on desktop, tucked into an
 * overflow menu on mobile.
 */
const PIPELINE_STATUSES: readonly StatusFilter[] = [
  'all',
  'draft',
  'sent',
  'accepted',
];
const CLOSED_STATUSES: readonly StatusFilter[] = ['rejected', 'expired'];

// Every filter shares one ghost language: an icon/label that overlaps the
// container's bottom border (-mb-px) and gains an accent underline when active.
const tabBase =
  'relative -mb-px inline-flex items-center gap-1.5 px-1 pb-2.5 border-b-2 border-transparent font-mono text-[12.5px] tracking-[0.02em] text-soft transition-colors cursor-pointer hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const tabActive = 'text-accent border-accent';

// Menu row inside the mobile overflow popover (labels always visible there).
const rowBase =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-[12.5px] text-left cursor-pointer transition-colors';

const STATUS_ICON: Record<StatusFilter, IconSvgElement> = {
  all: Menu01Icon,
  draft: PencilEdit02Icon,
  sent: SentIcon,
  accepted: CheckmarkCircle02Icon,
  rejected: CancelCircleIcon,
  expired: CalendarRemove01Icon,
};

/**
 * Filter controls for the quotes list. Active filters live in the URL
 * (?status=&due=&archived=) so the page stays a Server Component and the view
 * is shareable. This component only translates control changes into the URL.
 */
export function QuoteFilterBar({
  status,
  due,
  archived,
  archivedCount,
}: QuoteFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const setParam = useCallback(
    (key: FilterKey, value: string, fallback: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === fallback) {
        params.delete(key);
      } else {
        params.set(key, value);
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

  // Due-date filter is now a single actionable slice: "expiring soon" (the
  // lapsed/expired case is covered by the Scaduto lifecycle status).
  const expiringActive = due === 'expiring';
  const toggleExpiring = () =>
    setParam('due', expiringActive ? '' : 'expiring', DEFAULT_DUE_FILTER);
  const toggleArchived = () => setParam('archived', archived ? '' : '1', '');
  const showArchived = archived || archivedCount > 0;

  // Any secondary filter active → surface it on the overflow trigger so mobile
  // always shows *what* is filtered, not just that something is.
  const secondaryActive =
    status === 'rejected' ||
    status === 'expired' ||
    expiringActive ||
    archived;
  const secondaryLabel =
    status === 'rejected' || status === 'expired'
      ? STATUS_FILTER_LABEL[status]
      : expiringActive
        ? 'In scadenza'
        : archived
          ? 'Archiviati'
          : null;

  const statusTab = (value: StatusFilter) => {
    const active = status === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setParam('status', value, DEFAULT_STATUS_FILTER)}
        aria-pressed={active}
        aria-label={STATUS_FILTER_LABEL[value]}
        title={STATUS_FILTER_LABEL[value]}
        className={cn(tabBase, active && tabActive)}
      >
        <HugeiconsIcon icon={STATUS_ICON[value]} size={15} aria-hidden />
        {/* Active tab shows its label even on mobile, so the selection is
            explicit; inactive tabs stay icon-only until sm:. */}
        <span className={active ? 'inline' : 'hidden sm:inline'}>
          {STATUS_FILTER_LABEL[value]}
        </span>
      </button>
    );
  };

  const popRow = (
    key: string,
    active: boolean,
    onClick: () => void,
    icon: IconSvgElement,
    label: string,
    badge?: number
  ) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        onClick();
        setMenuOpen(false);
      }}
      aria-pressed={active}
      className={`${rowBase} ${
        active
          ? 'text-accent bg-accent/[0.08]'
          : 'text-soft hover:text-foreground hover:bg-foreground/[0.04]'
      }`}
    >
      <HugeiconsIcon icon={icon} size={16} aria-hidden />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="font-mono text-[11px] text-muted">{badge}</span>
      ) : null}
      {active && <HugeiconsIcon icon={Tick02Icon} size={15} aria-hidden />}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Filtri preventivi"
      data-pending={isPending ? '' : undefined}
      className="flex items-end justify-between gap-x-3 sm:justify-start sm:gap-x-5 border-b border-border mb-5 data-[pending]:opacity-60 transition-opacity"
    >
      {/* Pipeline — primary, always visible; spread across the width on mobile.
          The mobile overflow sits inside this distributed row so it shares the
          even spacing instead of crowding the last pipeline icon. */}
      <div className="flex items-end gap-x-4 sm:gap-x-5 max-sm:flex-1 max-sm:justify-between">
        {PIPELINE_STATUSES.map((value) => statusTab(value))}
        <div className="sm:hidden">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={
                  secondaryLabel ? `Filtro attivo: ${secondaryLabel}` : 'Altri filtri'
                }
                className={cn(tabBase, secondaryActive && tabActive)}
              >
                <HugeiconsIcon icon={FilterIcon} size={16} aria-hidden />
                {secondaryActive && secondaryLabel && (
                  <span>{secondaryLabel}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-col gap-0.5">
              <p className="px-2.5 pt-1 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                Stati chiusi
              </p>
              {CLOSED_STATUSES.map((value) =>
                popRow(
                  value,
                  status === value,
                  () => setParam('status', value, DEFAULT_STATUS_FILTER),
                  STATUS_ICON[value],
                  STATUS_FILTER_LABEL[value]
                )
              )}
              <span aria-hidden className="my-1 h-px bg-border" />
              <p className="px-2.5 pt-1 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                Affinamenti
              </p>
              {popRow(
                'due-expiring',
                expiringActive,
                toggleExpiring,
                AlarmClockIcon,
                'In scadenza'
              )}
              {showArchived &&
                popRow(
                  'archived',
                  archived,
                  toggleArchived,
                  Archive02Icon,
                  'Archiviati',
                  !archived && archivedCount > 0 ? archivedCount : undefined
                )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Secondary — inline with dividers on desktop only. */}
      <div className="hidden sm:flex items-end gap-x-5">
        <span aria-hidden className="w-px self-stretch bg-border mb-2.5" />
        <div className="flex items-end gap-x-5">
          {CLOSED_STATUSES.map((value) => statusTab(value))}
        </div>
        <span aria-hidden className="w-px self-stretch bg-border mb-2.5" />
        <div className="flex items-end gap-x-5">
          <button
            type="button"
            onClick={toggleExpiring}
            aria-pressed={expiringActive}
            title="In scadenza (entro 7 giorni)"
            className={cn(tabBase, expiringActive && tabActive)}
          >
            <HugeiconsIcon icon={AlarmClockIcon} size={15} aria-hidden />
            <span>In scadenza</span>
          </button>
          {showArchived && (
            <button
              type="button"
              onClick={toggleArchived}
              aria-pressed={archived}
              title={archived ? 'Preventivi attivi' : 'Preventivi archiviati'}
              className={cn(tabBase, archived && tabActive)}
            >
              <HugeiconsIcon icon={Archive02Icon} size={15} aria-hidden />
              <span>Archiviati</span>
              {!archived && archivedCount > 0 && (
                <span className="font-mono text-[11px] text-muted">
                  {archivedCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
