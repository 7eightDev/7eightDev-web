"use client";

import { useEffect, useRef, useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  EyeIcon,
  FileAddIcon,
  MoreHorizontalIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import {
  deleteLeadAction,
  createQuoteFromLeadAction,
  toggleLeadFavoriteAction,
} from "@/application/lead/admin.actions";
import type { LeadStatus } from "@/domain/lead/lead.types";
import { cn } from "@/presentation/lib/utils";
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
  favorite: boolean;
}

// Ghost by default: no bordered box, so the row reads quieter and the only
// control per row is a single "…" toggle that slides the action cluster in
// from the right (mirrors the quotes list pattern).
const iconBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const sendBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-[#0a0b0d] cursor-pointer transition-all duration-150 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const toggleBtn =
  "relative z-20 inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const dangerIconBtn =
  "inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-accent-coral/10 hover:text-accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LeadRowActions({
  id,
  companyName,
  status,
  favorite,
}: LeadRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cellRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic<
    boolean,
    boolean
  >(favorite, (_state, next) => next);

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
    router.push(`/admin/leads/${id}`);
  };

  const createQuote = () => {
    setMenuOpen(false);
    setQuoteOpen(true);
  };

  const confirmCreateQuote = () => {
    setError(null);
    startTransition(async () => {
      const result = await createQuoteFromLeadAction(id);
      if (!result.ok) setError(result.error ?? "Creazione preventivo non riuscita.");
      else setQuoteOpen(false);
    });
  };

  const toggleFavorite = () => {
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      await toggleLeadFavoriteAction({ leadId: id });
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
      <div
        ref={cellRef}
        onClick={(e) => e.stopPropagation()}
        className="relative inline-flex items-center justify-end self-stretch"
      >
        <div
          inert={!menuOpen}
          className={`absolute -top-4 -bottom-4 -right-5 z-10 flex items-center gap-1 rounded-l-lg bg-[rgba(35,38,46,0.82)] pl-4 pr-24 shadow-[-16px_0_18px_-10px_rgba(0,0,0,0.5)] backdrop-blur-[6px] transition-[transform,opacity] duration-300 ease-out ${
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
                <HugeiconsIcon icon={EyeIcon} size={18} aria-hidden />
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
                  className={sendBtn}
                >
                  <HugeiconsIcon icon={FileAddIcon} size={18} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>Crea preventivo</TooltipContent>
            </Tooltip>
          )}

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Elimina ${companyName}`}
                    className={dangerIconBtn}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden />
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

          <AlertDialog open={quoteOpen} onOpenChange={setQuoteOpen}>
            <AlertDialogContent onCloseAutoFocus={() => setError(null)}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Creare preventivo per «{companyName}»?
                </AlertDialogTitle>
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
                    confirmCreateQuote();
                  }}
                >
                  {pending ? "Creazione…" : "Crea preventivo"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <button
          type="button"
          onClick={toggleFavorite}
          disabled={pending}
          aria-label={
            optimisticFavorite
              ? `Rimuovi ${companyName} dai preferiti`
              : `Aggiungi ${companyName} ai preferiti`
          }
          aria-pressed={optimisticFavorite}
          title={
            optimisticFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"
          }
          className={cn(
            "relative z-20 inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 hover:bg-foreground/[0.06] disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer",
            optimisticFavorite
              ? "text-accent-amber hover:text-accent-amber"
              : "text-soft hover:text-foreground"
          )}
        >
          <HugeiconsIcon
            icon={StarIcon}
            size={16}
            aria-hidden
            className={cn(optimisticFavorite && "fill-current")}
          />
        </button>

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
          <HugeiconsIcon icon={MoreHorizontalIcon} size={18} aria-hidden />
        </button>
      </div>
    </TooltipProvider>
  );
}