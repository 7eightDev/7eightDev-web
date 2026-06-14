'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Menu01Icon,
  PencilEdit02Icon,
  SentIcon,
} from '@hugeicons/core-free-icons';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/presentation/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import {
  DEFAULT_DUE_FILTER,
  DEFAULT_STATUS_FILTER,
  DUE_FILTER_LABEL,
  DUE_FILTER_VALUES,
  STATUS_FILTER_LABEL,
  STATUS_FILTER_VALUES,
  type DueFilter,
  type StatusFilter,
} from '@/presentation/features/admin/quote-filters';

interface QuoteFilterBarProps {
  status: StatusFilter;
  due: DueFilter;
}

type FilterKey = 'status' | 'due';

// Status reads as a row of tabs: an accent underline marks the active one.
// Items overlap the container's bottom border (-mb-px) so the active underline
// sits flush on that baseline, the classic tabs treatment.
const tab =
  'relative -mb-px gap-1.5 px-1 pb-2.5 border-b-2 border-transparent font-mono text-[12.5px] tracking-[0.02em] text-soft hover:text-foreground data-[state=on]:text-accent data-[state=on]:border-accent';

// Icons per status tab (presentation concern, kept out of the logic module).
// Colour is inherited via currentColor, so each icon picks up the active accent.
const STATUS_ICON: Record<StatusFilter, IconSvgElement> = {
  all: Menu01Icon,
  draft: PencilEdit02Icon,
  sent: SentIcon,
  accepted: CheckmarkCircle02Icon,
};

/**
 * Filter controls for the quotes list. The active filters live in the URL
 * (?status=&due=) so the page stays a Server Component, the view is
 * shareable/bookmarkable, and back/forward navigation restores state. This
 * component only translates control changes into query-string updates.
 *
 * Status is a tab strip (the primary axis you slice the list by); due-date is a
 * secondary, compact dropdown to its right.
 */
export function QuoteFilterBar({ status, due }: QuoteFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Write a single filter key to the URL. A reset-to-default value (or Radix's
  // empty string when deselecting the active tab) drops the key entirely to
  // keep URLs clean.
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

  return (
    <div
      data-pending={isPending ? '' : undefined}
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border mb-5 data-[pending]:opacity-60 transition-opacity"
    >
      <ToggleGroup
        type="single"
        value={status}
        onValueChange={(v) => setParam('status', v, DEFAULT_STATUS_FILTER)}
        aria-label="Filtra per stato"
        className="items-end gap-x-4 gap-y-1 sm:gap-x-5"
      >
        {STATUS_FILTER_VALUES.map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className={tab}
            title={STATUS_FILTER_LABEL[value]}
            aria-label={STATUS_FILTER_LABEL[value]}
          >
            <HugeiconsIcon icon={STATUS_ICON[value]} size={15} aria-hidden />
            <span className="hidden sm:inline">
              {STATUS_FILTER_LABEL[value]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="pb-2.5">
        <Select
          value={due}
          onValueChange={(v) => setParam('due', v, DEFAULT_DUE_FILTER)}
        >
          <SelectTrigger aria-label="Filtra per scadenza">
            <span className="inline-flex items-center gap-2">
              <HugeiconsIcon
                icon={Calendar03Icon}
                size={15}
                aria-hidden
                className="opacity-70"
              />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {DUE_FILTER_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'all'
                  ? `Scadenza: ${DUE_FILTER_LABEL[value]}`
                  : DUE_FILTER_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
