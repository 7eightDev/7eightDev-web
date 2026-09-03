"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startLeadGenerationAction } from "@/application/lead/admin.actions";
import { cn } from "@/presentation/lib/utils";

const inputClass =
  "px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim w-full";
const labelClass =
  "font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-[6px] block";

/**
 * Search form for launching a lead generation job (query + location +
 * quantity). On submit it calls the server action, which runs the pipeline
 * synchronously and redirects to the leads list on success.
 */
export function LeadSearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await startLeadGenerationAction({
        query,
        location,
        quantity: quantity ? Number(quantity) : undefined,
      });
      // On success the action redirects; we only land here on failure.
      if (result && !result.ok) setError(result.error ?? "Errore.");
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[680px]">
      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="lead-query">
              Nicchia *
            </label>
            <input
              id="lead-query"
              className={inputClass}
              value={query}
              placeholder="es. Dentisti"
              disabled={pending}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="lead-location">
              Località *
            </label>
            <input
              id="lead-location"
              className={inputClass}
              value={location}
              placeholder="es. Milano"
              disabled={pending}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="lead-quantity">
            Quantità
          </label>
          <input
            id="lead-quantity"
            type="number"
            min={1}
            className={cn(inputClass, "sm:max-w-[220px]")}
            value={quantity}
            placeholder="es. 100"
            disabled={pending}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <p className="font-mono text-[10.5px] text-muted mt-1">
            Limite di lead da cercare (opzionale).
          </p>
        </div>
      </section>

      {error && (
        <p role="alert" className="font-mono text-[12.5px] text-[var(--coral)]">
          {error}
        </p>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={() => router.push("/admin/leads")}
          className="font-mono text-xs font-semibold px-4 py-3 rounded-lg border border-border text-muted hover:text-soft transition-all"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !query || !location}
          className={cn(
            "font-mono text-[15px] font-semibold px-6 py-[14px] rounded-[9px] transition-all duration-150",
            pending || !query || !location
              ? "bg-raised text-muted cursor-not-allowed"
              : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
          )}
        >
          {pending ? "Ricerca in corso…" : "Avvia ricerca →"}
        </button>
      </div>
    </div>
  );
}