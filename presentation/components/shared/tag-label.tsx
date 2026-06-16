import { cn } from "@/presentation/lib/utils";

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
      {" "}
      <span className="text-accent" aria-hidden="true">/</span>
      <span className="text-muted" aria-hidden="true">&gt;</span>
    </div>
  );
}
