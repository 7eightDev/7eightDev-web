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
      <div className="flex flex-col gap-2">
        <SortableList
          items={value}
          getId={(p) => p.id}
          onReorder={onChange}
          className="flex flex-col gap-2"
        >
          {(pair, handleProps) => {
            const i = value.findIndex((p) => p.id === pair.id);
            return (
              <div className="flex flex-col sm:grid sm:grid-cols-[auto_180px_1fr] gap-2 items-start pb-4 sm:pb-0 border-b border-border/40 sm:border-0 last:border-0">
                <DragHandle handleProps={handleProps} />
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
                    onClick={() => onChange(value.filter((p) => p.id !== pair.id))}
                    className="font-mono text-sm text-muted px-3 py-[10px] rounded-lg border border-transparent cursor-pointer hover:text-[var(--coral)] hover:border-border shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          }}
        </SortableList>
        <button
          type="button"
          onClick={() => onChange([...value, makePair()])}
          className="self-start font-mono text-xs font-semibold text-soft px-3 py-2 rounded-lg border border-border cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent"
        >
          + Aggiungi
        </button>
      </div>
    </div>
  );
}
