import { cn } from "@/presentation/lib/utils";

interface LeadScoreBadgeProps {
  /** PageSpeed performance score (0–100). Untyped/missing means unknown. */
  score?: number;
}

/**
 * Score badge for a lead. Lower is better for lead generation: a weak site
 * (score < 50) is a stronger opportunity, so it reads as brand lime; a healthy
 * site (score >= 50) reads neutral/muted. This mirrors the quotes status badge
 * weight (color mixed 45% into the base border).
 */
export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  if (score === undefined || score === null) {
    return (
      <span className="font-mono text-[11px] text-muted border border-border rounded-full px-2 py-[2px]">
        —
      </span>
    );
  }

  const weak = score < 50;

  return (
    <span
      className={cn(
        "font-mono text-[11px] rounded-full px-2 py-[2px] border",
        weak
          ? "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]"
          : "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]"
      )}
    >
      {score}
    </span>
  );
}