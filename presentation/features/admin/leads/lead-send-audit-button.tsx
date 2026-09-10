"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Send } from "lucide-react";
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
import { sendLeadPresentationAction } from "@/application/lead/lead-email.actions";

interface LeadSendAuditButtonProps {
  leadId: string;
  companyName: string;
  recipientEmail?: string;
  disabled?: boolean;
}

/**
 * Sends the value-first presentation email (PDF audit attached) to the lead's
 * client. Confirmation dialog shows the recipient; on confirmed delivery the
 * lead moves to `audit_sent`. Dev builds also expose an "Anteprima report"
 * shortcut to the report/email preview studio.
 */
export function LeadSendAuditButton({
  leadId,
  companyName,
  recipientEmail,
  disabled = false,
}: LeadSendAuditButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [send, setSend] = useState<
    { state: "idle" } | { state: "sent"; message?: string } | { state: "error"; message?: string }
  >({ state: "idle" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isDev = process.env.NODE_ENV !== "production";

  const previewHref = `/admin/leads/report?lead=${encodeURIComponent(leadId)}`;

  const onSend = () => {
    if (!recipientEmail) {
      setSend({
        state: "error",
        message: "Il lead non ha un indirizzo email a cui inviare l'audit.",
      });
      return;
    }
    setSend({ state: "idle" });
    startTransition(async () => {
      const result = await sendLeadPresentationAction(leadId);
      if (result.ok) {
        setSend({ state: "sent", message: result.messageId });
        setConfirmOpen(false);
        router.refresh();
      } else {
        setSend({
          state: "error",
          message: result.error ?? "Invio non riuscito.",
        });
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {isDev && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="cursor-pointer border border-border text-soft hover:text-foreground shrink-0"
          >
            <a href={previewHref} target="_blank" rel="noreferrer">
              <Eye size={14} aria-hidden /> Anteprima report
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setConfirmOpen(true)}
          className="cursor-pointer border-accent/50 text-accent hover:bg-accent/10 hover:text-accent shrink-0"
        >
          <Send size={14} aria-hidden /> Invia audit
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onCloseAutoFocus={() => setSend({ state: "idle" })}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Inviare l&apos;audit a «{companyName}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Verr&agrave; generato il report PDF con i dati dell&apos;analisi e
              inviato{recipientEmail ? ` a ${recipientEmail}` : " (nessuna email disponibile)"}{" "}
              insieme all&apos;email di presentazione. Alla conferma il lead passa
              a «Audit inviato».
            </AlertDialogDescription>
          </AlertDialogHeader>

          {send.state === "error" && (
            <p
              role="alert"
              className="mt-[14px] font-mono text-[12.5px] text-[var(--coral)]"
            >
              ✗ {send.message}
            </p>
          )}
          {send.state === "sent" && (
            <p className="mt-[14px] font-mono text-[12.5px] text-accent">
              ✓ Audit inviato{send.message ? ` · id ${send.message}` : ""}.
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
                onSend();
              }}
            >
              {pending ? "Invio…" : "Invia audit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}