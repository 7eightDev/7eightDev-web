"use client";

import { useState, useTransition } from "react";
import { sendQuoteAction } from "@/application/quote/admin.actions";
import type { QuoteStatus } from "@/domain/quote/quote.types";

interface QuoteRowActionsProps {
  quoteId: string;
  status: QuoteStatus;
}

export function QuoteRowActions({ quoteId, status }: QuoteRowActionsProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${quoteId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendQuoteAction(quoteId);
      if (!result.ok) setError(result.error ?? "Errore.");
    });
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {error && (
        <span className="font-hanken text-xs text-[var(--coral)]">{error}</span>
      )}
      <button
        type="button"
        onClick={copyLink}
        className="font-mono text-xs font-semibold px-3 py-2 rounded-lg border border-border text-soft cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent"
      >
        {copied ? "Copiato ✓" : "Copia link"}
      </button>
      <a
        href={`/p/${quoteId}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs font-semibold px-3 py-2 rounded-lg border border-border text-soft transition-all duration-150 hover:border-accent hover:text-accent"
      >
        Apri
      </a>
      {status === "draft" && (
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="font-mono text-xs font-semibold px-3 py-2 rounded-lg bg-accent text-[#0a0b0d] cursor-pointer transition-all duration-150 hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Invio…" : "Segna inviato"}
        </button>
      )}
    </div>
  );
}
