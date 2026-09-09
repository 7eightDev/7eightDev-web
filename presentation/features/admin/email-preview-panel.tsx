"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (view !== "html" || !iframe) return;

    const hideScrollbar = () => {
      const doc = iframe.contentDocument;
      if (!doc || doc.getElementById("email-preview-scrollbar")) return;
      const style = doc.createElement("style");
      style.id = "email-preview-scrollbar";
      style.textContent =
        "html::-webkit-scrollbar{display:none}html{scrollbar-width:none}";
      (doc.head ?? doc.documentElement).appendChild(style);
    };

    iframe.addEventListener("load", hideScrollbar);
    if (iframe.contentDocument?.readyState === "complete") hideScrollbar();
    return () => iframe.removeEventListener("load", hideScrollbar);
  }, [view, selectedId]);

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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)] lg:flex-1 lg:min-h-0">
      {/* left: scenario selector + subject + view toggle */}
      <aside className="flex flex-col gap-4 min-w-0 self-center">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
            Scenario
          </span>
          <div className="flex flex-col gap-2">
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
        </div>

        <div className="min-w-0 rounded-xl bg-surface border border-border p-4">
          <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted block mb-1">
            Oggetto
          </span>
          <span className="font-hanken text-[15px] text-foreground break-words">
            {selected.subject}
          </span>
        </div>

        <div className="flex gap-2">
          {(["html", "text"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "font-mono text-[11px] px-3 py-2 rounded-lg border cursor-pointer transition-all uppercase flex-1",
                view === v
                  ? "border-accent text-accent"
                  : "border-border text-muted hover:text-soft"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </aside>

      {/* center: preview */}
      {view === "html" ? (
        <iframe
          ref={iframeRef}
          title="Anteprima email"
          srcDoc={selected.html}
          className="w-full h-full min-h-0 block"
        />
      ) : (
        <pre className="w-full h-full min-h-0 overflow-auto no-scrollbar rounded-xl bg-raised p-4 font-mono text-[12.5px] text-soft whitespace-pre-wrap">
          {selected.text}
        </pre>
      )}

      {/* right: test send */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-col gap-3 self-center">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
          Invio di test (Resend reale · nessun preventivo creato)
        </span>
        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="destinatario@esempio.com"
          className="w-full px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={pending}
          className={cn(
            "font-mono text-sm font-semibold px-5 py-[10px] rounded-lg transition-all w-full",
            pending
              ? "bg-raised text-muted cursor-not-allowed"
              : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105"
          )}
        >
          {pending ? "Invio…" : "Invia test →"}
        </button>
        {send.status === "ok" && (
          <p className="font-mono text-[12px] text-accent m-0 break-words">
            ✓ Inviata{send.messageId ? ` · id ${send.messageId}` : ""}.
          </p>
        )}
        {send.status === "error" && (
          <p className="font-mono text-[12px] text-[var(--coral)] m-0 break-words">
            ✗ {send.error}
          </p>
        )}
      </div>
    </div>
  );
}
