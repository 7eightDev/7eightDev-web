"use client";

import { useMemo, useState } from "react";
import { acceptQuoteAction } from "@/application/quote/accept-quote.action";
import { calculateQuote } from "@/application/quote/quote.service";
import type { Quote } from "@/domain/quote/quote.types";
import { formatMoney } from "@/domain/shared/money";
import { Container } from "@/presentation/components/shared/container";
import { Eyebrow } from "@/presentation/components/shared/eyebrow";
import { LogoLockup } from "@/presentation/components/shared/logo";
import { Reveal } from "@/presentation/components/shared/reveal";
import { AcceptancePanel } from "@/presentation/features/quote/acceptance-panel";
import { ItemLine } from "@/presentation/features/quote/item-line";
import { SectionTitle } from "@/presentation/features/quote/section-title";
import { formatDateIt } from "@/presentation/lib/format-date";

interface QuoteViewProps {
  quote: Quote;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-[6px]">
        {label}
      </div>
      <div className="font-hanken text-[15px] text-foreground font-medium">
        {value}
      </div>
    </div>
  );
}

export function QuoteView({ quote }: QuoteViewProps) {
  const isAccepted = quote.status === "accepted";

  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    quote.acceptance?.selectedOptionalIds ?? []
  );
  const [accepted, setAccepted] = useState(isAccepted);
  const [acceptedByName, setAcceptedByName] = useState(
    quote.acceptance?.acceptedByName
  );

  const mandatory = quote.lineItems.filter((item) => !item.optional);
  const optional = quote.lineItems.filter((item) => item.optional);

  const calc = useMemo(
    () => calculateQuote(quote, selectedIds),
    [quote, selectedIds]
  );

  const toggle = (id: string) => {
    if (accepted) return;
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  };

  const handleAccept = async (name: string) => {
    const result = await acceptQuoteAction(quote.id, name, selectedIds);
    if (result.ok) {
      setAccepted(true);
      setAcceptedByName(name);
    }
    return result;
  };

  const meta = quote.metadata;
  const vatLabel = `IVA ${Math.round(quote.vatRate * 100)}%`;

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-40 bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] border-b border-border print:hidden">
        <Container className="max-w-[980px] h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LogoLockup size={15} />
            <span className="w-px h-[22px] bg-border" />
            <span className="font-mono text-[13px] text-soft">
              Preventivo ·{" "}
              <span className="text-foreground">{quote.client.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => window.print()}
              className="font-mono text-sm font-semibold px-[14px] py-[9px] rounded-[9px] border border-border text-foreground bg-transparent cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent"
            >
              Stampa
            </button>
            {!accepted && (
              <a
                href="#accetta"
                className="font-mono text-sm font-semibold px-4 py-[9px] rounded-[9px] bg-accent text-[#0a0b0d] transition-all duration-150 hover:brightness-105 hover:-translate-y-px"
              >
                Accetta
              </a>
            )}
          </div>
        </Container>
      </header>

      <Container className="max-w-[980px] px-8 pt-14 pb-[100px]">
        {/* header */}
        <Reveal>
          <Eyebrow>
            preventivo · /p/{quote.id.slice(0, 18)}…
          </Eyebrow>
          <h1 className="font-space font-semibold text-[clamp(32px,4.4vw,48px)] tracking-[-0.03em] leading-[1.05] mt-[18px] mb-0 text-foreground">
            {quote.project}
          </h1>
          <p className="font-hanken text-[17px] leading-relaxed text-soft max-w-[660px] mt-[18px]">
            {quote.intro}
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="grid grid-cols-4 max-[820px]:grid-cols-2 gap-6 mt-[38px] py-[26px] border-y border-border">
            <Meta label="Cliente" value={quote.client.company ?? quote.client.name} />
            <Meta label="N. preventivo" value={quote.number} />
            <Meta label="Data" value={formatDateIt(quote.issuedAt)} />
            <Meta label="Valido fino al" value={formatDateIt(quote.validUntil)} />
          </div>
        </Reveal>

        {/* 01 — voci */}
        <div className="mt-14">
          <Reveal>
            <SectionTitle n="01">Voci di lavoro</SectionTitle>
          </Reveal>
          <Reveal delay={60}>
            <div className="flex flex-col gap-[2px]">
              {mandatory.map((item, i) => (
                <div
                  key={item.id}
                  className={
                    i < mandatory.length - 1 ? "border-b border-border" : ""
                  }
                >
                  <ItemLine item={item} />
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* 02 — moduli opzionali */}
        {optional.length > 0 && (
          <div className="mt-[52px]">
            <Reveal>
              <SectionTitle n="02">Moduli opzionali</SectionTitle>
              <p className="font-hanken text-[14.5px] text-soft -mt-3 mb-[22px] max-w-[560px]">
                {accepted
                  ? "Selezione confermata in fase di accettazione."
                  : "Attiva ciò che ti serve: il totale si aggiorna in tempo reale."}
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="flex flex-col gap-[10px]">
                {optional.map((item) => (
                  <ItemLine
                    key={item.id}
                    item={item}
                    selected={selectedIds.includes(item.id)}
                    onToggle={() => toggle(item.id)}
                    disabled={accepted}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* totale */}
        <Reveal delay={60}>
          <div className="mt-10 ml-auto max-w-[420px] p-6 rounded-[14px] bg-surface border border-border">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <span className="font-hanken text-[14.5px] text-soft">Subtotale</span>
              <span className="font-mono text-[14.5px] text-foreground whitespace-nowrap">
                {formatMoney(calc.oneTimeSubtotal)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 mb-4 pb-4 border-b border-border">
              <span className="font-hanken text-[14.5px] text-soft">{vatLabel}</span>
              <span className="font-mono text-[14.5px] text-soft whitespace-nowrap">
                {formatMoney(calc.vat)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-space text-lg font-semibold text-foreground">
                Totale
              </span>
              <span className="font-space text-[26px] font-bold text-accent tracking-[-0.02em] whitespace-nowrap">
                {formatMoney(calc.oneTimeTotal)}
              </span>
            </div>
            {calc.monthlyRecurring.amountCents > 0 && (
              <div className="flex items-baseline justify-between gap-4 mt-3 pt-3 border-t border-border">
                <span className="font-hanken text-[14.5px] text-soft">
                  Canoni ricorrenti
                </span>
                <span className="font-mono text-[14.5px] text-foreground whitespace-nowrap">
                  {formatMoney(calc.monthlyRecurring)} /mese
                </span>
              </div>
            )}
          </div>
        </Reveal>

        {/* 03 — tempi */}
        {meta.phases && meta.phases.length > 0 && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n="03">Tempi</SectionTitle>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-4 max-[820px]:grid-cols-2 gap-4">
                {meta.phases.map((phase, i) => (
                  <div key={phase.title} className="relative pt-6">
                    <div
                      className={`absolute top-0 left-0 right-0 h-[2px] rounded-[1px] ${
                        i === 0 ? "bg-accent" : "bg-border"
                      }`}
                    />
                    <div className="font-mono text-xs text-muted mb-2">
                      {phase.weeks}
                    </div>
                    <div className="font-space text-lg font-semibold text-foreground">
                      {phase.title}
                    </div>
                  </div>
                ))}
              </div>
              {meta.timelineNote && (
                <div className="font-hanken text-[14.5px] text-soft mt-[22px]">
                  {meta.timelineNote}
                </div>
              )}
            </Reveal>
          </div>
        )}

        {/* 04 — termini */}
        {meta.terms && meta.terms.length > 0 && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n="04">Termini</SectionTitle>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-[18px]">
                {meta.terms.map((term) => (
                  <div
                    key={term.label}
                    className="p-5 rounded-xl bg-surface border border-border"
                  >
                    <div className="font-mono text-xs text-accent tracking-[0.06em] mb-2">
                      {term.label}
                    </div>
                    <div className="font-hanken text-[14.5px] leading-[1.55] text-soft">
                      {term.body}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* 05 — stack tecnico */}
        {meta.techStack && meta.techStack.length > 0 && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n="05">Stack tecnico</SectionTitle>
              <p className="font-hanken text-[14.5px] text-soft -mt-3 mb-[22px] max-w-[560px]">
                Le tecnologie scelte per il tuo progetto — e perché contano.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-3 max-[820px]:grid-cols-2 gap-3">
                {meta.techStack.map((entry) => (
                  <div
                    key={entry.label}
                    className="px-4 py-[14px] rounded-xl bg-surface border border-border"
                  >
                    <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-[6px]">
                      {entry.label}
                    </div>
                    <div className="font-space text-[15px] font-semibold text-foreground">
                      {entry.technology}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* accettazione */}
        <div id="accetta" className="mt-16 scroll-mt-20">
          <Reveal delay={40}>
            <AcceptancePanel
              clientName={quote.client.name}
              accepted={accepted}
              acceptedByName={acceptedByName}
              onAccept={handleAccept}
            />
          </Reveal>

          <div className="flex justify-between items-center mt-[30px] flex-wrap gap-3">
            <LogoLockup size={14} />
            <span className="font-mono text-xs text-muted">
              {quote.number} · ciao@7eight.dev · domande? rispondi alla mail
            </span>
          </div>
        </div>
      </Container>
    </>
  );
}
