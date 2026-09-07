"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteJobAction } from "@/application/lead/admin.actions";
import { cn } from "@/presentation/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";

interface LeadJobDeleteButtonProps {
  jobId: string;
  jobQuery: string;
  jobLocation: string;
}

/** Trash button that opens a confirmation AlertDialog before deleting a
 *  recent search job. Leads stay in the system; only the association is lost. */
export function LeadJobDeleteButton({
  jobId,
  jobQuery,
  jobLocation,
}: LeadJobDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteJobAction(jobId);
      if (!result.ok) setError(result.error ?? "Eliminazione non riuscita.");
      else setOpen(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Elimina la ricerca «${jobQuery}»`}
          title="Elimina ricerca"
          className={cn(
            "inline-flex items-center justify-center size-7 rounded-md text-dim cursor-pointer transition-all duration-150",
            "hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)]",
            "disabled:opacity-50 disabled:cursor-wait"
          )}
        >
          <HugeiconsIcon icon={Delete02Icon} size={15} aria-hidden />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Eliminare «{jobQuery}»
            {jobLocation ? ` · ${jobLocation}` : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            La ricerca verrà rimossa dalla lista. I lead associati restano nel
            sistema ma perderanno il collegamento alla ricerca. Non è possibile
            annullare l&apos;operazione.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p
            role="alert"
            className="mt-3.5 font-mono text-[12.5px] text-[var(--coral)]"
          >
            {error}
          </p>
        )}

        <AlertDialogFooter className="grid grid-cols-2 gap-2.5">
          <AlertDialogCancel className="w-full" disabled={pending}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            className="w-full bg-accent-coral text-[#0a0b0d] hover:brightness-105"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              remove();
            }}
          >
            {pending ? "Eliminazione…" : "Elimina"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
