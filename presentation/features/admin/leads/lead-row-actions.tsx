"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BanIcon,
  Delete02Icon,
  EyeIcon,
  FileAddIcon,
  Mail01Icon,
  MoreHorizontalIcon,
  SentIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import {
  deleteLeadAction,
  createQuoteFromLeadAction,
  updateLeadOutreachAction,
} from "@/application/lead/admin.actions";
import type { LeadOutreachStatus, LeadStatus } from "@/domain/lead/lead.types";
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
  status: LeadStatus;
  /** Called when the user asks for the slide-over detail. */
  onOpenDetail: (id: string, companyName: string) => void;
}

// Ghost by default: no bordered box, so the row reads quieter and the only
// control per row is a single "…" toggle that slides the action cluster in
// from the right (mirrors the quotes list pattern).
const iconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const toggleBtn =
  "relative z-[5] inline-flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const dangerIconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-[var(--coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LeadRowActions({
  id,
  companyName,
  status,
  onOpenDetail,
}: LeadRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cellRef = useRef<HTMLDivElement>(null);

  // The slide-in lives inside the row (no portal), so dismissal is ours to
  // manage: collapse on outside pointer-down or Escape.
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

  const openDetail = () => {
    setMenuOpen(false);
    onOpenDetail(id, companyName);
  };

  const createQuote = () => {
    setMenuOpen(false);
    startTransition(() => {
      void createQuoteFromLeadAction(id);
    });
  };

  const setOutreach = (outreachStatus: LeadOutreachStatus) => {
    setMenuOpen(false);
    startTransition(() => {
      void updateLeadOutreachAction({ leadId: id, outreachStatus });
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteLeadAction(id);
      if (!result.ok) setError(result.error ?? "Eliminazione non riuscita.");
      else setDeleteOpen(false);
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={cellRef} className="relative inline-flex items-center justify-end self-stretch">
        <div
          inert={!menuOpen}
          className={`absolute top-1/2 right-0 z-[5] flex -translate-y-1/2 items-center gap-0.5 rounded-l-lg bg-[rgba(35,38,46,0.9)] py-0.5 pr-14 pl-1.5 shadow-[-16px_0_18px_-10px_rgba(0,0,0,0.5)] backdrop-blur-[6px] transition-[transform,opacity] duration-300 ease-out ${
            menuOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openDetail}
                aria-label={`Apri il dettaglio di ${companyName}`}
                className={iconBtn}
              >
                <HugeiconsIcon icon={EyeIcon} size={17} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Dettaglio</TooltipContent>
          </Tooltip>

          {status === "qualified" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={createQuote}
                  disabled={pending}
                  aria-label={`Crea preventivo da ${companyName}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent cursor-pointer transition-all duration-150 hover:bg-accent hover:text-[#0a0b0d] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <HugeiconsIcon icon={FileAddIcon} size={17} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>Crea preventivo</TooltipContent>
            </Tooltip>
          )}

          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOutreach("audit_sent")}
                disabled={pending}
                aria-label={`Segna audit inviato per ${companyName}`}
                className={iconBtn}
              >
                <HugeiconsIcon icon={SentIcon} size={17} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Audit inviato</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOutreach("in_talks")}
                disabled={pending}
                aria-label={`Segna in trattativa per ${companyName}`}
                className={iconBtn}
              >
                <HugeiconsIcon icon={Mail01Icon} size={17} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>In trattativa</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOutreach("closed_won")}
                disabled={pending}
                aria-label={`Segna cliente acquisito per ${companyName}`}
                className={iconBtn}
              >
                <HugeiconsIcon icon={Tick02Icon} size={17} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Cliente acquisito</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOutreach("rejected")}
                disabled={pending}
                aria-label={`Segna rifiutato per ${companyName}`}
                className={iconBtn}
              >
                <HugeiconsIcon icon={BanIcon} size={17} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Rifiutato</TooltipContent>
          </Tooltip>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Elimina ${companyName}`}
                    className={dangerIconBtn}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={17} aria-hidden />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Elimina</TooltipContent>
            </Tooltip>

            <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Eliminare «{companyName}»?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Il lead e le sue analisi verranno rimossi definitivamente.
                  Non è possibile annullare l&apos;operazione.
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
          aria-label={`Azioni per ${companyName}`}
          aria-expanded={menuOpen}
          className={`${toggleBtn} ${
            menuOpen
              ? "bg-foreground/[0.06] text-accent"
              : "text-soft hover:text-foreground"
          }`}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={17} aria-hidden />
        </button>
      </div>
    </TooltipProvider>
  );
}