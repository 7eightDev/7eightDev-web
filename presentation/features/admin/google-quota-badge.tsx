"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/presentation/components/ui/tooltip";
import { cn } from "@/presentation/lib/utils";

/** Polling cadence for the quota badge. */
export const QUOTA_POLL_INTERVAL_MS = 15_000;

interface QuotaBucketState {
  readonly used: number;
  readonly limit: number;
}

interface QuotaState {
  readonly date: string;
  readonly buckets: Record<string, QuotaBucketState | undefined>;
}

/**
 * Live "Quota Google" badge shown in the admin header. Polls the read-only
 * /admin/api/google-quota endpoint (auth enforced by the Clerk proxy) and turns
 * amber near the limit, red when the daily quota is exhausted (calls blocked).
 */
export function GoogleQuotaBadge() {
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const res = await fetch("/admin/api/google-quota", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as QuotaState;
        if (active) setQuota(data);
      } catch {
        // Network hiccup — keep showing the last known values.
      }
    };

    refresh();
    const id = setInterval(refresh, QUOTA_POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!quota) return null;

  const textSearch = quota.buckets["places-text-search"];
  const autocomplete = quota.buckets["places-autocomplete"];
  if (!textSearch || !autocomplete) return null;

  const used = textSearch.used;
  const limit = textSearch.limit;
  const remaining = Math.max(limit - used, 0);
  const exhausted = remaining === 0;
  const nearLimit = !exhausted && remaining <= 5;

  const tone = exhausted
    ? "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]"
    : nearLimit
      ? "text-accent-amber border-[color-mix(in_oklab,var(--color-accent-amber)_45%,var(--border))]"
      : "text-soft border-border";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Quota API Google di oggi"
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 font-mono text-[12px] border rounded-[8px] px-2.5 py-1.5 cursor-help bg-transparent",
            tone,
          )}
        >
          <Gauge className="size-[13px] opacity-80 shrink-0" />
          <span>
            Quota: {used}/{limit}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span>Utilizzo API Google di oggi ({quota.date})</span>
          <span className="text-dim">
            Ricerche (Text Search): {used}/{limit}
          </span>
          <span className="text-dim">
            Autocomplete: {autocomplete.used}/{autocomplete.limit}
          </span>
          {exhausted && <span className="text-[var(--coral)]">Bloccato: quota esaurita, riprova domani.</span>}
          {nearLimit && <span className="text-accent-amber">Quasi esaurita: restano {remaining} ricerche.</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}