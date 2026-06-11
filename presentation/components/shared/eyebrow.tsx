import { cn } from "@/presentation/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <div className={cn(
      "font-mono text-[13px] tracking-[0.12em] uppercase text-accent font-semibold flex items-center gap-[9px]",
      className
    )}>
      <span className="opacity-60">{"//"}</span>
      {children}
    </div>
  );
}
