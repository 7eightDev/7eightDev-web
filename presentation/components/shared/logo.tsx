import { cn } from "@/presentation/lib/utils";

interface LogoMarkProps {
  size?: number;
  radius?: number;
  bg?: string;
  stroke?: string;
  className?: string;
}

export function LogoMark({ size = 40, radius = 11, bg = "#101216", stroke = "#23262e", className }: LogoMarkProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("block", className)}>
      <rect x="1" y="1" width="46" height="46" rx={radius} fill={bg} stroke={stroke} strokeWidth="1.5" />
      <path d="M16 15l-5 9 5 9" stroke="#4a5160" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 14l-8 20" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M32 15l5 9-5 9" stroke="#4a5160" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface LogoLockupProps {
  size?: number;
  cursor?: boolean;
  gap?: number;
  markSize?: number;
  color?: string;
  className?: string;
}

export function LogoLockup({ size = 22, cursor = false, gap = 11, markSize, color = "#eef1f5", className }: LogoLockupProps) {
  return (
    <div className={cn("flex items-center", className)} style={{ gap }}>
      <LogoMark size={markSize || size * 1.9} radius={Math.round((markSize || size * 1.9) * 0.26)} />
      <div className="flex items-center font-mono font-bold leading-none tracking-[-0.02em]" style={{ fontSize: size }}>
        <span style={{ color }}>7eight</span>
        <span style={{ color: "var(--accent)" }}>Dev</span>
        {cursor && (
          <span 
            className="bg-accent rounded-[1px] animate-blink" 
            style={{ width: size * 0.42, height: size, marginLeft: size * 0.16 }} 
          />
        )}
      </div>
    </div>
  );
}
