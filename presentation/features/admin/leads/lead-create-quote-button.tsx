"use client";

import { useState, useTransition } from "react";
import { FileAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createQuoteFromLeadAction } from "@/application/lead/admin.actions";
import { Button } from "@/presentation/components/ui/button";

/**
 * Creates a draft quote pre-populated from a qualified lead. Redirects to the
 * quote composer for review once the draft is persisted.
 */
export function LeadCreateQuoteButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createQuoteFromLeadAction(leadId);
      if (!result.ok) setError(result.error ?? "Creazione preventivo non riuscita.");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="default" size="sm" onClick={create} disabled={pending}>
        <HugeiconsIcon
          icon={FileAddIcon}
          size={16}
          aria-hidden
          className={pending ? "animate-spin" : undefined}
        />
        {pending ? "Creazione…" : "Crea preventivo"}
      </Button>
      {error && (
        <span role="alert" className="font-mono text-[11px] text-[var(--coral)]">
          {error}
        </span>
      )}
    </div>
  );
}
