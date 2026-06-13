'use client';

import { useState, useTransition } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUpRight01Icon,
  CopyLinkIcon,
  Edit02Icon,
  SentIcon,
  Tick02Icon
} from '@hugeicons/core-free-icons';
import { sendQuoteAction } from '@/application/quote/admin.actions';
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
}

const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-soft cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const sendBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-[#0a0b0d] cursor-pointer transition-all duration-150 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function QuoteRowActions({
  quoteId,
  status,
  clientName,
  sendBlockReason
}: QuoteRowActionsProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const canSend = !sendBlockReason;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyLink}
              aria-label={copied ? 'Link copiato' : 'Copia link del preventivo'}
              className={iconBtn}
            >
              <HugeiconsIcon
                icon={copied ? Tick02Icon : CopyLinkIcon}
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
                    className="mt-[14px] font-mono text-[12.5px] text-coral"
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
      </div>
    </TooltipProvider>
  );
}
