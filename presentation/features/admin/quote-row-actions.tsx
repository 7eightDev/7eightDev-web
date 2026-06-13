"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  CopyLinkIcon,
  Edit02Icon,
  SentIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { sendQuoteAction } from "@/application/quote/admin.actions";
import type { QuoteStatus } from "@/domain/quote/quote.types";

interface QuoteRowActionsProps {
  quoteId: string;
  status: QuoteStatus;
}

const iconBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-soft cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
        title={copied ? "Link copiato" : "Copia link"}
        aria-label={copied ? "Link copiato" : "Copia link del preventivo"}
        className={iconBtn}
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : CopyLinkIcon}
          size={18}
          aria-hidden
          className={copied ? "text-accent" : undefined}
        />
      </button>

      <a
        href={`/p/${quoteId}`}
        target="_blank"
        rel="noreferrer"
        title="Apri pagina pubblica"
        aria-label="Apri la pagina pubblica del preventivo in una nuova scheda"
        className={iconBtn}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden />
      </a>

      {status === "draft" && (
        <>
          <a
            href={`/admin/quotes/${quoteId}/edit`}
            title="Modifica bozza"
            aria-label="Modifica la bozza del preventivo"
            className={iconBtn}
          >
            <HugeiconsIcon icon={Edit02Icon} size={18} aria-hidden />
          </a>
          <button
            type="button"
            onClick={send}
            disabled={pending}
            title="Segna come inviato"
            aria-label="Segna il preventivo come inviato"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-[#0a0b0d] cursor-pointer transition-all duration-150 hover:brightness-105 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <HugeiconsIcon
              icon={SentIcon}
              size={18}
              aria-hidden
              className={pending ? "animate-pulse" : undefined}
            />
          </button>
        </>
      )}
    </div>
  );
}
