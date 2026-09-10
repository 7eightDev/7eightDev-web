"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createQuoteFromLeadAction } from "@/application/lead/admin.actions";
import { storeLeadQuoteInput } from "@/presentation/features/admin/leads/lead-quote-draft";
import { Button } from "@/presentation/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/presentation/components/ui/alert-dialog";

/**
 * Prepares a pre-populated quote input from a qualified lead and redirects to
 * the quote composer for review. The quote is only created when the user
 * explicitly saves from the composer.
 */
export function LeadCreateQuoteButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createQuoteFromLeadAction(leadId);
      if (!result.ok) {
        setError(result.error ?? "Creazione preventivo non riuscita.");
      } else {
        storeLeadQuoteInput(result.input);
        setConfirmOpen(false);
        router.push("/admin/quotes/new");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="default"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="cursor-pointer bg-accent text-[#0a0b0d] hover:brightness-105 hover:-translate-y-px"
      >
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Creare il preventivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà creato un preventivo in bozza basato sui dati del lead.
              Potrai modificarlo prima dell&apos;invio.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p
              role="alert"
              className="mt-[14px] font-mono text-[12.5px] text-[var(--coral)]"
            >
              {error}
            </p>
          )}

          <AlertDialogFooter className="grid grid-cols-2 gap-[10px]">
            <AlertDialogCancel className="w-full" disabled={pending}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                create();
              }}
            >
              {pending ? "Creazione…" : "Crea preventivo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
