"use client";

import { useState, useTransition } from "react";
import { rerunLeadGenerationAction } from "@/application/lead/admin.actions";
import { cn } from "@/presentation/lib/utils";

interface LeadJobRerunButtonProps {
  jobId: string;
}

/**
 * Client-only button that re-runs the search behind a job card, reusing the
 * same job so the sidebar does not accumulate duplicate cards.
 */
export function LeadJobRerunButton({ jobId }: LeadJobRerunButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rerun = () => {
    setError(null);
    startTransition(async () => {
      const result = await rerunLeadGenerationAction(jobId);
      if (result && !result.ok) {
        setError(result.error ?? "Errore.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={rerun}
        disabled={pending}
        className={cn(
          "font-mono text-[11px] tracking-wide text-muted transition-colors",
          pending
            ? "cursor-wait"
            : "hover:text-foreground cursor-pointer"
        )}
      >
        {pending ? "↻ Avvio…" : "↻ Ripeti ricerca"}
      </button>
      {error && (
        <span
          role="alert"
          className="font-mono text-[10.5px] text-[var(--coral)] truncate"
        >
          {error}
        </span>
      )}
    </div>
  );
}