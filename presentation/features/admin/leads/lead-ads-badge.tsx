import { cn } from "@/presentation/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/presentation/components/ui/tooltip";

interface LeadAdsBadgeProps {
  /** Detected ad-tracking platforms, e.g. ['Google Ads', 'Meta Pixel', 'GTM']. */
  adsTrackers?: readonly string[];
}

const TRACKER_LABELS: Record<string, string> = {
  "Google Ads": "Google Ads",
  "Meta Pixel": "Meta Pixel (FB/IG)",
  GTM: "Google Tag Manager",
};

/**
 * Compact "Ads" badge for a lead row. Shown only when ad trackers were
 * detected; the tooltip lists the exact platforms found.
 */
export function LeadAdsBadge({ adsTrackers }: LeadAdsBadgeProps) {
  const trackers = adsTrackers ?? [];
  if (trackers.length === 0) {
    return <span className="font-mono text-[11px] text-muted-foreground/40">—</span>;
  }

  const label = trackers.length === 1 ? "Ads" : `Ads · ${trackers.length}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.06em] uppercase rounded-full px-2 py-[2px] border cursor-default",
              "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-accent/[0.06]"
            )}
          >
            ● {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {trackers.length === 1
            ? `${TRACKER_LABELS[trackers[0]] ?? trackers[0]} Rilevato`
            : `${trackers
                .map((t) => TRACKER_LABELS[t] ?? t)
                .join(" & ")} Rilevati`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}