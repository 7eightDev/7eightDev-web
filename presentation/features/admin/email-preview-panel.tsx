"use client";

import { useState, useTransition } from "react";
import { sendTestEmailAction } from "@/application/quote/email-test.actions";
import { cn } from "@/presentation/lib/utils";

export interface RenderedScenario {
  readonly id: string;
  readonly label: string;
  readonly kind: "sent" | "accepted";
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

interface EmailPreviewPanelProps {
  readonly scenarios: readonly RenderedScenario[];
  readonly defaultRecipient: string;
  /** Id to preselect (e.g. deep-linked from the quote list). */
  readonly initialId?: string;
}

type SendState =
  | { status: "idle" }
  | { status: "ok"; messageId?: string }
  | { status: "error"; error: string };

export function EmailPreviewPanel({
  scenarios,
  defaultRecipient,
  initialId,
}: EmailPreviewPanelProps) {
  const [selectedId, setSelectedId] = useState(
    initialId && scenarios.some((s) => s.id === initialId)
      ? initialId
      : (scenarios[0]?.id ?? "")
  );
  const [view, setView] = useState<"html" | "text">("html");
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [send, setSend] = useState<SendState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  const selected =
    scenarios.find((s) => s.id === selectedId) ?? scenarios[0];

  const onSend = () => {
    if (!selected) return;
    setSend({ status: "idle" });
    startTransition(async () => {
      const result = await sendTestEmailAction(selected.id, recipient);
      setSend(
        result.ok
          ? { status: "ok", messageId: result.messageId }
          : { status: "error", error: result.error ?? "Errore sconosciuto." }
      );
    });
  };

  if (!selected) {
    return <p className="font-mono text-sm text-muted">Nessuno scenario.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* scenario selector */}
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSelectedId(s.id);
              setSend({ status: "idle" });
            }}
            className={cn(
              "font-mono text-[12px] px-3 py-2 rounded-lg border cursor-pointer transition-all text-left",
              s.id === selected.id
                ? "border-accent text-accent"
                : "border-border text-muted hover:text-soft"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* subject + view toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted block mb-1">
            Oggetto
          </span>
          <span className="font-hanken text-[15px] text-foreground break-words">
            {selected.subject}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          {(["html", "text"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "font-mono text-[11px] px-3 py-2 rounded-lg border cursor-pointer transition-all uppercase",
                view === v
                  ? "border-accent text-accent"
                  : "border-border text-muted hover:text-soft"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* preview */}
      {view === "html" ? (
        <iframe
          title="Anteprima email"
          srcDoc={selected.html}
          className="w-full h-[640px] rounded-xl border border-border bg-white"
        />
      ) : (
        <pre className="w-full max-h-[640px] overflow-auto rounded-xl border border-border bg-raised p-4 font-mono text-[12.5px] text-soft whitespace-pre-wrap">
          {selected.text}
        </pre>
      )}

      {/* test send */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-col gap-3">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
          Invio di test (Resend reale · nessun preventivo creato)
        </span>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="destinatario@esempio.com"
            className="flex-1 min-w-[220px] px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={pending}
            className={cn(
              "font-mono text-sm font-semibold px-5 py-[10px] rounded-lg transition-all",
              pending
                ? "bg-raised text-muted cursor-not-allowed"
                : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105"
            )}
          >
            {pending ? "Invio…" : "Invia test →"}
          </button>
        </div>
        {send.status === "ok" && (
          <p className="font-mono text-[12px] text-accent m-0">
            ✓ Inviata{send.messageId ? ` · id ${send.messageId}` : ""}.
          </p>
        )}
        {send.status === "error" && (
          <p className="font-mono text-[12px] text-[var(--coral)] m-0">
            ✗ {send.error}
          </p>
        )}
      </div>
    </div>
  );
}
