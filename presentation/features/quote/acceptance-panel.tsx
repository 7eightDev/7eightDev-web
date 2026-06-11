"use client";

import { useState, useTransition } from "react";
import { cn } from "@/presentation/lib/utils";

interface AcceptancePanelProps {
  clientName: string;
  accepted: boolean;
  acceptedByName?: string;
  onAccept: (name: string) => Promise<{ ok: boolean; error?: string }>;
}

export function AcceptancePanel({
  clientName,
  accepted,
  acceptedByName,
  onAccept,
}: AcceptancePanelProps) {
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = name.trim().length >= 2 && consent && !pending;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await onAccept(name.trim());
      if (!result.ok) setError(result.error ?? "Qualcosa è andato storto.");
    });
  };

  return (
    <div
      className={cn(
        "p-9 rounded-2xl border transition-all duration-300",
        accepted
          ? "border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))]"
          : "border-border bg-surface"
      )}
    >
      {accepted ? (
        <div className="flex items-center gap-[18px]">
          <span className="w-[46px] h-[46px] rounded-3xl shrink-0 bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] border border-accent flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5l3 3 7-8"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h2 className="font-space text-[22px] font-semibold tracking-[-0.02em] m-0 mb-1 text-foreground">
              Preventivo accettato.
            </h2>
            <p className="font-hanken text-[14.5px] text-soft m-0">
              Ti invio contratto e fattura di acconto entro oggi. Grazie
              {acceptedByName ? `, ${acceptedByName}` : `, ${clientName}`}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="max-w-[560px]">
            <h2 className="font-space text-2xl font-semibold tracking-[-0.02em] m-0 mb-2 text-foreground">
              Procediamo?
            </h2>
            <p className="font-hanken text-[15px] leading-relaxed text-soft m-0">
              Accettando questo preventivo riceverai il contratto e la fattura
              di acconto. Nessun impegno fino alla firma.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-[6px]">
              <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
                Nome e cognome
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                autoComplete="name"
                className="w-[260px] px-4 py-3 rounded-[9px] bg-raised border border-border text-foreground font-hanken text-[15px] outline-none transition-colors focus:border-accent placeholder:text-dim"
              />
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                "font-mono text-[15px] font-semibold px-6 py-[15px] rounded-[9px] border border-transparent transition-all duration-150 whitespace-nowrap",
                canSubmit
                  ? "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
                  : "bg-raised text-muted cursor-not-allowed"
              )}
            >
              {pending ? "Invio…" : "Accetta il preventivo →"}
            </button>
          </div>

          <label className="flex items-start gap-3 cursor-pointer max-w-[560px]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-[3px] w-4 h-4 accent-[var(--accent)]"
            />
            <span className="font-hanken text-[13.5px] leading-snug text-soft">
              Confermo di aver letto il preventivo, le voci selezionate e i
              termini indicati, e accetto la proposta per conto di {clientName}.
            </span>
          </label>

          {error && (
            <p className="font-hanken text-sm text-[var(--coral)] m-0" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
