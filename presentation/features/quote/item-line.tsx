import type { LineItem } from "@/domain/quote/quote.types";
import { formatMoney } from "@/domain/shared/money";
import { cn } from "@/presentation/lib/utils";

interface ItemLineProps {
  item: LineItem;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}

export function ItemLine({ item, selected, onToggle, disabled }: ItemLineProps) {
  const optional = item.optional;
  const on = !optional || selected;

  const content = (
    <>
      {optional && (
        <span
          aria-hidden
          className={cn(
            "w-[22px] h-[22px] rounded-md mt-px shrink-0 border-[1.5px] flex items-center justify-center transition-all duration-150",
            on ? "border-accent bg-accent" : "border-dim bg-transparent"
          )}
        >
          {on && (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5l3 3 7-8"
                stroke="#0a0b0d"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
      <div className="text-left">
        <div className="font-space text-[16.5px] font-semibold text-foreground tracking-[-0.01em]">
          {item.title}
        </div>
        <div className="font-hanken text-sm leading-normal text-soft mt-1 max-w-[540px]">
          {item.description}
        </div>
      </div>
      <div
        className={cn(
          "font-mono text-[15px] font-medium whitespace-nowrap text-right",
          on ? "text-foreground" : "text-muted"
        )}
      >
        {formatMoney(item.unitPrice)}
        {item.type === "recurring" && (
          <span className="text-muted text-[12px]">
            {item.interval === "monthly" ? " /mese" : " /anno"}
          </span>
        )}
      </div>
    </>
  );

  if (!optional) {
    return (
      <div className="grid grid-cols-[1fr_auto] gap-4 items-start px-5 py-[18px]">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "w-full grid grid-cols-[24px_1fr_auto] gap-4 items-start px-5 py-[18px] rounded-xl border transition-all duration-150",
        disabled ? "cursor-default" : "cursor-pointer",
        selected
          ? "bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))] border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]"
          : "bg-surface border-border"
      )}
    >
      {content}
    </button>
  );
}
