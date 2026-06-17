'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Archive02Icon,
  ArchiveRestoreIcon,
  ArrowUpRight01Icon,
  CalendarRemove01Icon,
  CancelCircleIcon,
  Delete02Icon,
  Edit02Icon,
  Link01Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  SentIcon,
  Tick02Icon
} from '@hugeicons/core-free-icons';
import {
  archiveQuoteAction,
  deleteQuoteAction,
  expireQuoteAction,
  rejectQuoteAction,
  sendQuoteAction,
  unarchiveQuoteAction
} from '@/application/quote/admin.actions';
import type { QuoteStatus } from '@/domain/quote/quote.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/presentation/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/presentation/components/ui/alert-dialog';

interface QuoteRowActionsProps {
  quoteId: string;
  status: QuoteStatus;
  clientName: string;
  /**
   * When set, the quote cannot be sent yet and this string explains why
   * (e.g. missing client email). The send action is disabled and the
   * reason is surfaced in its tooltip. Undefined means the quote is sendable.
   */
  sendBlockReason?: string;
  /** Whether this quote is archived — toggles archive ↔ restore in the menu. */
  archived: boolean;
  /**
   * Whether a sent quote may be marked expired (its validity has lapsed). The
   * authoritative check lives in expireQuote(); this only gates the UI control.
   */
  canExpire?: boolean;
  /** Extra classes for the root cell (e.g. layout/placement from the parent row). */
  className?: string;
}

// Ghost by default: no bordered box, so the row reads quieter and the only
// filled control (Send, below) clearly carries the primary action. The box
// surfaces on hover/focus instead of sitting there permanently.
const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const sendBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-[#0a0b0d] cursor-pointer transition-all duration-150 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

// The row stays quiet by default: a single toggle holds the actions. Clicking
// it slides the icon cluster in from the right, inside the row, so the list
// reads as one calm control per row and the status badges keep their alignment.
const toggleBtn =
  'relative z-20 inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

// Destructive variant of iconBtn: hover resolves to coral instead of accent,
// signalling that delete is irreversible.
const dangerIconBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg text-soft cursor-pointer transition-all duration-150 hover:bg-accent-coral/10 hover:text-accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function QuoteRowActions({
  quoteId,
  status,
  clientName,
  sendBlockReason,
  archived,
  canExpire,
  className
}: QuoteRowActionsProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [expireOpen, setExpireOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/p/${quoteId}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendQuoteAction(quoteId);
      if (!result.ok) setError(result.error ?? 'Invio non riuscito. Riprova.');
      else setOpen(false);
    });
  };

  const archive = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await archiveQuoteAction(quoteId);
      if (!result.ok)
        setActionError(result.error ?? 'Archiviazione non riuscita. Riprova.');
      else setArchiveOpen(false);
    });
  };

  const unarchive = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await unarchiveQuoteAction(quoteId);
      if (!result.ok)
        setActionError(result.error ?? 'Operazione non riuscita. Riprova.');
    });
  };

  const reject = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await rejectQuoteAction(quoteId);
      if (!result.ok)
        setActionError(result.error ?? 'Operazione non riuscita. Riprova.');
      else setRejectOpen(false);
    });
  };

  const expire = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await expireQuoteAction(quoteId);
      if (!result.ok)
        setActionError(result.error ?? 'Operazione non riuscita. Riprova.');
      else setExpireOpen(false);
    });
  };

  const remove = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);
      if (!result.ok)
        setActionError(result.error ?? 'Eliminazione non riuscita. Riprova.');
      else setDeleteOpen(false);
    });
  };

  const canSend = !sendBlockReason;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={cellRef}
        className={`relative flex items-center justify-self-end self-stretch${
          className ? ` ${className}` : ''
        }`}
      >
        <div
          inert={!menuOpen}
          className={`absolute -top-4 -bottom-4 -right-5 z-10 flex items-center gap-1 rounded-l-lg bg-[rgba(35,38,46,0.82)] pl-4 pr-16 shadow-[-16px_0_18px_-10px_rgba(0,0,0,0.5)] backdrop-blur-[6px] transition-[transform,opacity] duration-300 ease-out ${
            menuOpen
              ? 'translate-x-0 opacity-100'
              : 'translate-x-full opacity-0'
          }`}
        >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyLink}
              aria-label={copied ? 'Link copiato' : 'Copia link del preventivo'}
              className={iconBtn}
            >
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Link01Icon}
                size={18}
                aria-hidden
                className={copied ? 'text-accent' : undefined}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {copied ? 'Link copiato' : 'Copia link'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`/p/${quoteId}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Apri la pagina pubblica del preventivo in una nuova scheda"
              className={iconBtn}
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden />
            </a>
          </TooltipTrigger>
          <TooltipContent>Apri Preventivo</TooltipContent>
        </Tooltip>

        {process.env.NODE_ENV !== 'production' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`/admin/email?quote=${quoteId}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Anteprima dell'email prima dell'invio (dev)"
                className={iconBtn}
              >
                <HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden />
              </a>
            </TooltipTrigger>
            <TooltipContent>Anteprima email</TooltipContent>
          </Tooltip>
        )}

        {status === 'draft' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`/admin/quotes/${quoteId}/edit`}
                  aria-label="Modifica la bozza del preventivo"
                  className={iconBtn}
                >
                  <HugeiconsIcon icon={Edit02Icon} size={18} aria-hidden />
                </a>
              </TooltipTrigger>
              <TooltipContent>Modifica bozza</TooltipContent>
            </Tooltip>

            <AlertDialog open={open} onOpenChange={setOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {canSend ? (
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Invia il preventivo al cliente"
                        className={sendBtn}
                      >
                        <HugeiconsIcon icon={SentIcon} size={18} aria-hidden />
                      </button>
                    </AlertDialogTrigger>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-label={`Invio non disponibile: ${sendBlockReason}`}
                      className={sendBtn}
                    >
                      <HugeiconsIcon icon={SentIcon} size={18} aria-hidden />
                    </button>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {canSend ? 'Invia preventivo' : sendBlockReason}
                </TooltipContent>
              </Tooltip>

              <AlertDialogContent
                onCloseAutoFocus={() => setError(null)}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Inviare il preventivo a {clientName}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Il cliente riceverà un&apos;email con il link al preventivo e
                    potrà visualizzarlo. Lo stato passerà a &laquo;Inviato&raquo;.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {error && (
                  <p
                    role="alert"
                    className="mt-[14px] font-mono text-[12.5px] text-accent-coral"
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
                      send();
                    }}
                  >
                    {pending ? 'Invio in corso…' : 'Invia preventivo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {status === 'sent' && (
          <>
            <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      aria-label="Segna il preventivo come rifiutato"
                      className={dangerIconBtn}
                    >
                      <HugeiconsIcon icon={CancelCircleIcon} size={18} aria-hidden />
                    </button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Segna rifiutato</TooltipContent>
              </Tooltip>

              <AlertDialogContent onCloseAutoFocus={() => setActionError(null)}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Segnare come rifiutato il preventivo di {clientName}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Indica che il cliente ha declinato. Lo stato passerà a
                    &laquo;Rifiutato&raquo;: è uno stato finale, dopo il quale
                    potrai archiviare il preventivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {actionError && (
                  <p
                    role="alert"
                    className="mt-[14px] font-mono text-[12.5px] text-accent-coral"
                  >
                    {actionError}
                  </p>
                )}

                <AlertDialogFooter className="grid grid-cols-2 gap-[10px]">
                  <AlertDialogCancel className="w-full" disabled={pending}>
                    Annulla
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="w-full bg-accent-coral text-[#0a0b0d] hover:brightness-105"
                    disabled={pending}
                    onClick={(e) => {
                      e.preventDefault();
                      reject();
                    }}
                  >
                    {pending ? 'Operazione…' : 'Segna rifiutato'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {canExpire && (
              <AlertDialog open={expireOpen} onOpenChange={setExpireOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Segna il preventivo come scaduto"
                        className={iconBtn}
                      >
                        <HugeiconsIcon
                          icon={CalendarRemove01Icon}
                          size={18}
                          aria-hidden
                        />
                      </button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Segna scaduto</TooltipContent>
                </Tooltip>

                <AlertDialogContent onCloseAutoFocus={() => setActionError(null)}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Segnare come scaduto il preventivo di {clientName}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      La validità è terminata e il cliente non ha risposto. Lo
                      stato passerà a &laquo;Scaduto&raquo;, dopodiché potrai
                      archiviarlo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {actionError && (
                    <p
                      role="alert"
                      className="mt-[14px] font-mono text-[12.5px] text-accent-coral"
                    >
                      {actionError}
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
                        expire();
                      }}
                    >
                      {pending ? 'Operazione…' : 'Segna scaduto'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {archived ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={unarchive}
                disabled={pending}
                aria-label="Ripristina il preventivo dall'archivio"
                className={iconBtn}
              >
                <HugeiconsIcon icon={ArchiveRestoreIcon} size={18} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Ripristina</TooltipContent>
          </Tooltip>
        ) : status !== 'sent' ? (
          <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Archivia il preventivo"
                    className={iconBtn}
                  >
                    <HugeiconsIcon icon={Archive02Icon} size={18} aria-hidden />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Archivia</TooltipContent>
            </Tooltip>

            <AlertDialogContent onCloseAutoFocus={() => setActionError(null)}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Archiviare il preventivo di {clientName}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Sparirà dalla lista principale ma resterà consultabile dal
                  filtro &laquo;Archiviati&raquo; e potrà essere ripristinato in
                  qualsiasi momento. Lo stato non cambia.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {actionError && (
                <p
                  role="alert"
                  className="mt-[14px] font-mono text-[12.5px] text-accent-coral"
                >
                  {actionError}
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
                    archive();
                  }}
                >
                  {pending ? 'Archiviazione…' : 'Archivia'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {status === 'draft' && (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Elimina definitivamente la bozza"
                    className={dangerIconBtn}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Elimina bozza</TooltipContent>
            </Tooltip>

            <AlertDialogContent onCloseAutoFocus={() => setActionError(null)}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Eliminare la bozza di {clientName}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  L&apos;eliminazione è definitiva e non può essere annullata.
                  Solo le bozze possono essere eliminate; i preventivi inviati
                  vanno archiviati.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {actionError && (
                <p
                  role="alert"
                  className="mt-[14px] font-mono text-[12.5px] text-accent-coral"
                >
                  {actionError}
                </p>
              )}

              <AlertDialogFooter className="grid grid-cols-2 gap-[10px]">
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
                  {pending ? 'Eliminazione…' : 'Elimina'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Mostra le azioni del preventivo"
          aria-expanded={menuOpen}
          className={`${toggleBtn} ${
            menuOpen
              ? 'bg-foreground/[0.06] text-accent'
              : 'text-soft hover:text-foreground'
          }`}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={18} aria-hidden />
        </button>
      </div>
    </TooltipProvider>
  );
}
