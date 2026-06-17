"use client";

import {
  DragHandle,
  SortableList,
} from "@/presentation/components/shared/sortable-list";

export interface Pair {
  /** Client-side stable id, used for drag-and-drop ordering. Not persisted. */
  id: string;
  a: string;
  b: string;
}

let pairCounter = 0;
/** Generates a stable client-side id for a new pair. */
export const pairId = () => `pair-${++pairCounter}`;
/** Factory for a new pair with a stable id. */
export const makePair = (a = "", b = ""): Pair => ({ id: pairId(), a, b });

interface PairListEditorProps {
  label: string;
  aPlaceholder: string;
  bPlaceholder: string;
  value: Pair[];
  onChange: (value: Pair[]) => void;
  bMultiline?: boolean;
}

const inputClass =
  "px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim w-full";

/** Generic editor for label/value pair lists (phases, terms, tech stack). */
export function PairListEditor({
  label,
  aPlaceholder,
  bPlaceholder,
  value,
  onChange,
  bMultiline,
}: PairListEditorProps) {
  const update = (index: number, key: "a" | "b", v: string) => {
    onChange(value.map((p, i) => (i === index ? { ...p, [key]: v } : p)));
  };

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-2">
        {label}
      </div>
      <div className="flex flex-col gap-4">
        <SortableList
          items={value}
          getId={(p) => p.id}
          onReorder={onChange}
          className="flex flex-col gap-3"
        >
          {(pair, handleProps) => {
            const i = value.findIndex((p) => p.id === pair.id);
            return (
              <div className="p-4 rounded-xl bg-raised border border-border flex items-center gap-2">
                <DragHandle handleProps={handleProps} className="px-1 py-[10px] shrink-0" />
                <div
                  className={`flex-1 min-w-0 flex flex-col gap-2 ${
                    bMultiline ? "" : "sm:flex-row sm:items-center sm:gap-3"
                  }`}
                >
                  <input
                    type="text"
                    value={pair.a}
                    placeholder={aPlaceholder}
                    onChange={(e) => update(i, "a", e.target.value)}
                    className={`${inputClass} ${bMultiline ? "" : "sm:flex-1 sm:min-w-0"}`}
                  />
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
                      className={`${inputClass} sm:w-[150px] sm:shrink-0`}
                    />
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Rimuovi riga"
                  onClick={() => onChange(value.filter((p) => p.id !== pair.id))}
                  className="font-mono text-sm text-muted cursor-pointer transition-colors shrink-0 rounded-lg self-stretch flex items-center justify-center px-3 border border-border active:text-[var(--coral)] active:border-[var(--coral)] sm:self-center sm:px-2 sm:py-2.5 sm:border-transparent sm:hover:text-[var(--coral)] sm:hover:border-[var(--coral)]"
                >
                  ×
                </button>
              </div>
            );
          }}
        </SortableList>
        <button
          type="button"
          onClick={() => onChange([...value, makePair()])}
          className="self-end font-mono text-xs font-semibold text-soft px-3 py-2 rounded-lg border border-border cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent"
        >
          + Aggiungi
        </button>
      </div>
    </div>
  );
}
