import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";
import { formatDateIt } from "@/presentation/lib/format-date";
import { LeadScoreBadge } from "@/presentation/features/admin/leads/lead-score-badge";
import { cn } from "@/presentation/lib/utils";

interface LeadDetailProps {
  lead: Lead;
  /** Analyses for the lead; the latest qualifying one is surfaced. */
  analyses: LeadAnalysis[];
}

const QUALIFICATION_LABEL: Record<Lead["status"], string> = {
  new: "Da analizzare",
  analyzed: "Analizzato",
  qualified: "Qualificato",
  discarded: "Scartato",
};

function metric(
  label: string,
  value: number | undefined,
  hint?: string
) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
        {label}
      </span>
      <span className="font-mono text-[15px] text-foreground">
        {value === undefined || value === null ? (
          <span className="text-dim">—</span>
        ) : (
          <>
            {value}
            {hint && <span className="text-dim text-[12px]">{hint}</span>}
          </>
        )}
      </span>
    </div>
  );
}

function field(label: string, value: string | undefined) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted shrink-0">
        {label}
      </span>
      <span className="font-hanken text-[14px] text-foreground text-right break-words">
        {value || <span className="text-dim">—</span>}
      </span>
    </div>
  );
}

/**
 * Detail view for a single lead: company data plus PageSpeed metrics and the
 * qualification outcome. Rendered as surface cards matching the admin pattern.
 */
export function LeadDetail({ lead, analyses }: LeadDetailProps) {
  const latest = analyses[0];

  return (
    <div className="flex flex-col gap-6 max-w-[680px]">
      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="font-space text-lg font-semibold text-foreground m-0">
            {lead.companyName}
          </h2>
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.08em] uppercase rounded-full px-2 py-[2px] border",
              lead.status === "qualified"
                ? "text-accent border-[color-mix(in_oklab,var(--accent)_45%,var(--border))]"
                : lead.status === "discarded"
                  ? "text-[var(--coral)] border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]"
                  : "text-muted border-[color-mix(in_oklab,var(--muted)_45%,var(--border))]"
            )}
          >
            {QUALIFICATION_LABEL[lead.status]}
          </span>
        </div>

        <div className="flex flex-col">
          {field("Categoria", lead.category)}
          {field("Sito", lead.website)}
          {field("Telefono", lead.phone)}
          {field("Email", lead.email)}
          {field("Indirizzo", lead.address)}
          {field("Città", lead.city)}
          {field("Fonte", lead.source)}
          {field("Creato il", formatDateIt(lead.createdAt))}
        </div>
      </section>

      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
        <h2 className="font-space text-lg font-semibold text-foreground mb-4">
          Analisi PageSpeed
        </h2>

        {!latest ? (
          <p className="font-hanken text-soft m-0">
            Nessuna analisi disponibile per questo lead.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted">
                  Performance
                </span>
                <LeadScoreBadge score={latest.performanceScore} />
              </div>
              {metric("LCP", latest.lcp, " s")}
              {metric("FCP", latest.fcp, " s")}
              {metric("CLS", latest.cls)}
              {metric("TBT", latest.tbt, " ms")}
            </div>
            <p className="font-mono text-[11px] text-muted m-0">
              Strumento:{" "}
              <span className="text-soft">{latest.strategy}</span>
              {" · "}Analizzato il {formatDateIt(latest.analyzedAt)}
            </p>
          </>
        )}
      </section>
    </div>
  );
}