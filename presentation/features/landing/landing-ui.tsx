import { cn } from "@/presentation/lib/utils";
import { Reveal } from "@/presentation/components/shared/reveal";

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

interface TagLabelProps {
  /** Component name, PascalCase. Rendered in accent. */
  name: string;
  /** Optional single prop key. */
  propKey?: string;
  /**
   * Optional prop value. `string` renders as `key="value"`, `number` as
   * `key={value}`. Omit (with a propKey) for a boolean-style bare prop.
   */
  propValue?: string | number;
  center?: boolean;
  className?: string;
}

/**
 * Section eyebrow rendered as a self-closing JSX component, echoing the
 * 7eightDev logo (chevrons + lime slash). Brackets, `=` and numeric braces
 * are decorative and hidden from assistive tech; the readable text is the
 * component name and prop key/string value.
 */
export function TagLabel({ name, propKey, propValue, center, className }: TagLabelProps) {
  return (
    <div
      className={cn(
        "font-mono text-[15px] font-semibold tracking-[0.01em]",
        center && "text-center",
        className
      )}
    >
      <span className="text-muted" aria-hidden="true">&lt;</span>
      <span className="text-accent">{name}</span>
      {propKey && (
        <>
          {" "}
          <span className="text-soft">{propKey}</span>
          {propValue !== undefined &&
            (typeof propValue === "number" ? (
              <span className="text-soft" aria-hidden="true">{`={${propValue}}`}</span>
            ) : (
              <span className="text-soft">{`="${propValue}"`}</span>
            ))}
        </>
      )}
      <span className="whitespace-nowrap">
        {"\u00A0"}
        <span className="text-accent" aria-hidden="true">/</span>
        <span className="text-muted" aria-hidden="true">&gt;</span>
      </span>
    </div>
  );
}

interface SectionHeadProps {
  eyebrow: React.ReactNode;
  title: string;
  sub?: string;
  center?: boolean;
}

export function SectionHead({ eyebrow, title, sub, center }: SectionHeadProps) {
  return (
    <div className={cn("max-w-[720px]", center ? "mx-auto text-center" : "text-left")}>
      <Reveal>{eyebrow}</Reveal>
      <Reveal delay={60}>
        <h2 className="font-space font-semibold text-[clamp(28px,3.4vw,42px)] tracking-[-0.03em] leading-[1.06] mt-[18px] text-foreground text-balance">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={120}>
          <p className="font-sans text-[17px] leading-[1.58] text-soft mt-[18px]">{sub}</p>
        </Reveal>
      )}
    </div>
  );
}