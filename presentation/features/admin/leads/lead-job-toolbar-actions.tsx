"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  MoreHorizontalIcon,
  Refresh01Icon,
  StarIcon,
  StarOffIcon,
} from "@hugeicons/core-free-icons";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import {
  toggleJobFavoriteAction,
  rerunLeadGenerationAction,
  deleteJobAction,
} from "@/application/lead/admin.actions";
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

/** Minimal shape the action cluster needs from the selected toolbar job. */
export interface JobActionTarget {
  id: string;
  query: string;
  status: LeadGenerationJob["status"];
  favorite?: boolean;
}

interface LeadJobToolbarActionsProps {
  /** Job the actions apply to. Undefined when "all searches" is selected. */
  job: JobActionTarget | undefined;
  /** Disables the trigger entirely (no job selected). */
  disabled?: boolean;
}

const iconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const dangerIconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const STARRED =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-accent cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Slide-in action cluster for the job selected in the toolbar dropdown:
 * favorite, re-run and delete. Mirrors the quotes per-row action pattern.
 */
export function LeadJobToolbarActions({
  job,
  disabled = false,
}: LeadJobToolbarActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cellRef = useRef<HTMLDivElement>(null);

  const jobId = job?.id;
  const favorite = job?.favorite ?? false;
  const rerunnable =
    (job?.status === "completed" || job?.status === "failed") === true;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleFavorite = () => {
    if (!jobId) return;
    startTransition(async () => {
      await toggleJobFavoriteAction(jobId);
    });
  };

  const rerun = () => {
    if (!jobId) return;
    startTransition(async () => {
      await rerunLeadGenerationAction(jobId);
    });
  };

  const remove = () => {
    if (!jobId) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteJobAction(jobId);
      if (!result.ok) setError(result.error ?? "Eliminazione non riuscita.");
      else setDeleteOpen(false);
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={cellRef} className="relative inline-flex items-center justify-end self-stretch">
        <div
          inert={!menuOpen}
          className={`absolute top-1/2 right-0 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-l-lg bg-[rgba(35,38,46,0.9)] py-0.5 pr-12 pl-1.5 shadow-[-16px_0_18px_-10px_rgba(0,0,0,0.5)] backdrop-blur-[6px] transition-[transform,opacity] duration-300 ease-out ${
            menuOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={pending}
                aria-label={
                  favorite
                    ? `Rimuovi dai preferiti${job ? ` (${job.query})` : ""}`
                    : `Aggiungi ai preferiti${job ? ` (${job.query})` : ""}`
                }
                className={favorite ? STARRED : iconBtn}
              >
                <HugeiconsIcon
                  icon={favorite ? StarIcon : StarOffIcon}
                  size={17}
                  aria-hidden
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {favorite ? "Rimuovi preferito" : "Aggiungi preferito"}
            </TooltipContent>
          </Tooltip>

          {rerunnable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={rerun}
                  disabled={pending}
                  aria-label={`Ripeti la ricerca${job ? ` «${job.query}»` : ""}`}
                  className={iconBtn}
                >
                  <HugeiconsIcon icon={Refresh01Icon} size={17} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>Ripeti ricerca</TooltipContent>
            </Tooltip>
          )}

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Elimina la ricerca${job ? ` «${job.query}»` : ""}`}
                    className={dangerIconBtn}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={17} aria-hidden />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Elimina ricerca</TooltipContent>
            </Tooltip>

            <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Eliminare la ricerca{job ? ` «${job.query}»` : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  I lead trovati resteranno nella lista, ma perderanno il
                  collegamento a questa ricerca. L&apos;operazione non può
                  essere annullata.
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

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={disabled}
          aria-label={`Azioni per la ricerca selezionata`}
          aria-expanded={menuOpen}
          className={`${iconBtn} ${
            menuOpen ? "bg-foreground/[0.06] text-accent" : "text-soft hover:text-foreground"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={17} aria-hidden />
        </button>
      </div>
    </TooltipProvider>
  );
}