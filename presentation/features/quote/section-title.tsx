interface SectionTitleProps {
  n: string;
  children: React.ReactNode;
}

export function SectionTitle({ n, children }: SectionTitleProps) {
  return (
    <div className="flex items-baseline gap-3 mb-[22px]">
      <span className="font-mono text-[13px] text-accent">{n}</span>
      <h2 className="font-space text-2xl font-semibold tracking-[-0.02em] m-0 text-foreground">
        {children}
      </h2>
    </div>
  );
}
