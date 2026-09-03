"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { deleteLeadAction } from "@/application/lead/admin.actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/presentation/components/ui/tooltip";
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

interface LeadRowActionsProps {
  id: string;
  companyName: string;
}

const iconBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const deleteBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LeadRowActions({ id, companyName }: LeadRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteLeadAction(id);
      if (!result.ok) setError(result.error ?? "Eliminazione non riuscita.");
      else setOpen(false);
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 justify-self-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`/admin/leads/${id}`}
              aria-label={`Apri il dettaglio di ${companyName}`}
              className={iconBtn}
            >
              <HugeiconsIcon icon={EyeIcon} size={18} aria-hidden />
            </a>
          </TooltipTrigger>
          <TooltipContent>Dettaglio</TooltipContent>
        </Tooltip>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Elimina ${companyName}`}
                  className={deleteBtn}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Elimina</TooltipContent>
          </Tooltip>

          <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare «{companyName}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Il lead e le sue analisi verranno rimossi definitivamente. Non
                è possibile annullare l&apos;operazione.
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
                  remove();
                }}
              >
                {pending ? "Eliminazione…" : "Elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}