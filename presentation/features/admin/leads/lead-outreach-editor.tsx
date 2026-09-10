"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { Button } from "@/presentation/components/ui/button";
import { updateLeadOutreachAction } from "@/application/lead/admin.actions";
import type { LeadOutreachStatus } from "@/domain/lead/lead.types";
import { formatDateIt } from "@/presentation/lib/format-date";
import { cn } from "@/presentation/lib/utils";

export const OUTREACH_EDITOR_LABEL: Record<LeadOutreachStatus, string> = {
  not_contacted: "Da contattare",
  audit_sent: "Audit inviato",
  in_talks: "In trattativa",
  closed_won: "Cliente acquisito",
  rejected: "Rifiutato",
};

const OUTREACH_ORDER: LeadOutreachStatus[] = [
  "not_contacted",
  "audit_sent",
  "in_talks",
  "closed_won",
  "rejected",
];

interface LeadOutreachEditorProps {
  leadId: string;
  outreachStatus: LeadOutreachStatus;
  lastContactedAt: string | undefined;
  outreachNotes: string | undefined;
}

/**
 * "Stato Outreach & Vendita" editor: status select + free-text notes + save.
 * Pure client component so it can be dropped into both the slide-over Sheet
 * and the server-rendered full page. Local drafts start from the given lead;
 * parents remount it per lead (the table keys the Sheet by leadId, the full
 * page re-renders per request), so no prop-sync effect is needed.
 */
export function LeadOutreachEditor({
  leadId,
  outreachStatus,
  lastContactedAt,
  outreachNotes,
}: LeadOutreachEditorProps) {
  const [draftStatus, setDraftStatus] =
    useState<LeadOutreachStatus>(outreachStatus);
  const [draftNotes, setDraftNotes] = useState(outreachNotes ?? "");
  const [baselineStatus, setBaselineStatus] =
    useState<LeadOutreachStatus>(outreachStatus);
  const [baselineNotes, setBaselineNotes] = useState(outreachNotes ?? "");
  const [currentLastContactedAt, setCurrentLastContactedAt] =
    useState(lastContactedAt);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const dirty =
    draftStatus !== baselineStatus || draftNotes !== baselineNotes;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateLeadOutreachAction({
        leadId,
        outreachStatus: draftStatus,
        notes: draftNotes,
      });
      if (!result.ok) {
        setError(result.error ?? "Salvataggio non riuscito.");
      } else {
        setSavedAt(new Date().toISOString());
        setBaselineStatus(draftStatus);
        setBaselineNotes(draftNotes);
        if (result.lastContactedAt !== undefined) {
          setCurrentLastContactedAt(result.lastContactedAt);
        }
        // Re-render the server page so the row badge behind the sheet (and the
        // re-opened detail) reflects the persisted status immediately.
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
          Stato vendita
        </span>
        <Select
          value={draftStatus}
          onValueChange={(value) => setDraftStatus(value as LeadOutreachStatus)}
        >
          <SelectTrigger
            aria-label="Stato outreach"
            className="w-full"
          >
            <SelectValue placeholder="Stato outreach" />
          </SelectTrigger>
          <SelectContent>
            {OUTREACH_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {OUTREACH_EDITOR_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
          Note di vendita
        </span>
        <textarea
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          placeholder="Contatti, offerta accettata, follow-up…"
          aria-label="Note di vendita"
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 font-hanken text-[13px] text-foreground placeholder:text-dim outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-muted">
          {currentLastContactedAt ? (
            <>Ultimo contatto: {formatDateIt(currentLastContactedAt)}</>
          ) : (
            "Nessun contatto registrato"
          )}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending || (!dirty && savedAt === null)}
          className={cn(savedAt !== null && !dirty && "opacity-80")}
        >
          {pending
            ? "Salvataggio…"
            : dirty
              ? "Salva"
              : savedAt
                ? "Salvato"
                : "Salva"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="font-mono text-[12.5px] text-[var(--coral)]">
          {error}
        </p>
      )}
    </div>
  );
}