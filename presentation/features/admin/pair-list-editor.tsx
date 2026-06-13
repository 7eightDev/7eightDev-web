"use client";

export interface Pair {
  a: string;
  b: string;
}

interface PairListEditorProps {
  label: string;
  aPlaceholder: string;
  bPlaceholder: string;
  value: Pair[];
  onChange: (value: Pair[]) => void;
  bMultiline?: boolean;
}

/** Generic editor for label/value pair lists (phases, terms, tech stack). */
export function PairListEditor({
  label,
  aPlaceholder,
  bPlaceholder,
  value,
  onChange,
  bMultiline,
}: PairListEditorProps) {
  const update = (index: number, key: keyof Pair, v: string) => {
    onChange(value.map((p, i) => (i === index ? { ...p, [key]: v } : p)));
  };

  const inputClass =
    "px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim w-full";

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-2">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {value.map((pair, i) => (
          <div
            key={i}
            className="flex flex-col sm:grid sm:grid-cols-[180px_1fr_auto] gap-2 items-start pb-4 sm:pb-0 border-b border-border/40 sm:border-0 last:border-0"
          >
            <input
              type="text"
              value={pair.a}
              placeholder={aPlaceholder}
              onChange={(e) => update(i, "a", e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-2 w-full items-start">
              <div className="flex-1">
                {bMultiline ? (
                  <textarea
                    value={pair.b}
                    placeholder={bPlaceholder}
                    rows={2}
                    onChange={(e) => update(i, "b", e.target.value)}
                    className={`${inputClass} resize-y`}
                  />
                ) : (
                  <input
                    type="text"
                    value={pair.b}
                    placeholder={bPlaceholder}
                    onChange={(e) => update(i, "b", e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
              <button
                type="button"
                aria-label="Rimuovi riga"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="font-mono text-sm text-muted px-3 py-[10px] rounded-lg border border-transparent cursor-pointer hover:text-[var(--coral)] hover:border-border shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, { a: "", b: "" }])}
          className="self-start font-mono text-xs font-semibold text-soft px-3 py-2 rounded-lg border border-border cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent"
        >
          + Aggiungi
        </button>
      </div>
    </div>
  );
}
