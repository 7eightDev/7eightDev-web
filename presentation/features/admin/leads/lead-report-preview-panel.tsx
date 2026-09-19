"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { sendLeadTestEmailAction } from "@/application/lead/lead-email.actions";
import {
  renderLeadEmailPreviewHtml,
  renderLeadReportTextHtml,
} from "@/infrastructure/lead/report/lead-report.template";
import { useMounted } from "@/presentation/lib/use-mounted";
import { cn } from "@/presentation/lib/utils";

export interface RenderedReportScenario {
  readonly id: string;
  readonly label: string;
  readonly subject: string;
  readonly emailHtml: string;
  readonly reportHtml: string;
  readonly text: string;
  readonly reportDate: string;
  readonly downloadHref: string;
}

interface LeadReportPreviewPanelProps {
  readonly scenarios: readonly RenderedReportScenario[];
  readonly defaultRecipient: string;
  /** Id to preselect (e.g. deep-linked from the lead detail). */
  readonly initialId?: string;
}

type View = "email" | "report" | "text";

type SendState =
  | { status: "idle" }
  | { status: "ok"; messageId?: string }
  | { status: "error"; error: string };

const VIEW_LABEL: Record<View, string> = {
  email: "Email",
  report: "Report PDF",
  text: "Testo",
};

/** Nome accessibile dell'iframe: una scheda, un titolo. */
const VIEW_FRAME_TITLE: Record<View, string> = {
  email: "Anteprima email",
  report: "Anteprima report PDF",
  text: "Anteprima testo",
};

export function LeadReportPreviewPanel({
  scenarios,
  defaultRecipient,
  initialId,
}: LeadReportPreviewPanelProps) {
  const [selectedId, setSelectedId] = useState(
    initialId && scenarios.some((s) => s.id === initialId)
      ? initialId
      : (scenarios[0]?.id ?? "")
  );
  const [view, setView] = useState<View>("email");
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [send, setSend] = useState<SendState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  // next-themes legge `localStorage` già al primo render del client, mentre sul
  // server il tema non esiste: leggerlo subito darebbe due `srcDoc` diversi e
  // l'idratazione fallirebbe. Il primo passaggio rende quindi il tema chiaro —
  // lo stesso sul server e sul client, ed è anche la versione che il cliente
  // riceve davvero — e passa al tema dell'app appena montato.
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const currentTheme: "light" | "dark" =
    mounted && resolvedTheme === "dark" ? "dark" : "light";

  const selected =
    scenarios.find((s) => s.id === selectedId) ?? scenarios[0];

  const shownHtml =
    view === "email"
      ? renderLeadEmailPreviewHtml(selected.emailHtml, currentTheme)
      : view === "report"
      ? selected.reportHtml
      : renderLeadReportTextHtml(selected.text);

  const themedHtml = shownHtml?.replace(
    /<html(\s+[^>]*)?>/,
    "<html$1 data-theme=\"" + currentTheme + "\">"
  ) ?? null;

  const onSend = () => {
    if (!selected) return;
    setSend({ status: "idle" });
    startTransition(async () => {
      const result = await sendLeadTestEmailAction(selected.id, recipient);
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
          {(["email", "report", "text"] as const).map((v) => (
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
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </aside>

      {/* center: preview */}
      {themedHtml ? (
        <iframe
          key={`${selected.id}:${view}:${currentTheme}`}
          title={VIEW_FRAME_TITLE[view]}
          srcDoc={themedHtml}
          className="w-full h-full min-h-0 block rounded-lg border border-border"
        />
      ) : (
        <pre className="w-full h-full min-h-0 overflow-auto no-scrollbar rounded-xl bg-raised p-4 font-mono text-[12.5px] text-soft whitespace-pre-wrap">
          {selected.text}
        </pre>
      )}

      {/* right: test send + pdf download */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-col gap-3 self-center">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
          Invio di test (Resend reale · nessun dato modificato)
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
              : "bg-accent text-on-accent cursor-pointer hover:brightness-105"
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

        <a
          href={selected.downloadHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "font-mono text-sm font-semibold px-5 py-[10px] rounded-lg transition-all w-full text-center no-underline",
            "border border-accent text-accent hover:bg-accent/10"
          )}
        >
          Scarica PDF ↗
        </a>
        <span className="font-mono text-[10.5px] text-muted text-center">
          Report del {selected.reportDate}
        </span>
      </div>
    </div>
  );
}