import { cn } from "@/presentation/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function Chip({ children, accent = false, className }: ChipProps) {
  return (
    <span
      className={cn(
        "font-mono text-[12px] tracking-[0.04em] px-[10px] py-[5px] rounded-[6px] border border-border bg-surface inline-flex items-center gap-[7px] whitespace-nowrap",
        accent ? "text-accent" : "text-soft",
        className
      )}
    >
      {children}
    </span>
  );
}
