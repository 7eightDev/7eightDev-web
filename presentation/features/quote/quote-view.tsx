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

  // One-time and recurring mandatory items are presented separately: the
  // lump-sum mode bundles only the one-time deliverable into a single figure,
  // while recurring charges (manutenzione/canoni) are an ongoing, separately
  // billed commitment and must always stay itemized and priced.
  const mandatoryOneTime = quote.lineItems.filter(
    (item) => !item.optional && item.type === "one_time"
  );
  const mandatoryRecurring = quote.lineItems.filter(
    (item) => !item.optional && item.type === "recurring"
  );
  const optional = quote.lineItems.filter((item) => item.optional);
  // On-demand items ("interventi a chiamata"): priced as a starting base but
  // never part of the total — presented as a separate annex below the total.
  const onDemand = quote.lineItems.filter((item) => item.type === "on_demand");

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
  const isOccasional = quote.fiscalRegime === "occasional";
  const isLumpSum = meta.pricingDisplay === "lump_sum";
  const hasDiscount = calc.discount.amountCents > 0;
  const vatLabel = `IVA ${Math.round(quote.vatRate * 100)}%`;

  // Section numbers must reflect only the sections actually rendered.
  // Otherwise hiding a section (e.g. Tempi or Stack tecnico) leaves a gap in
  // the sequence (01 → 04). Numbers are assigned in render order.
  const showItems = mandatoryOneTime.length > 0;
  const showRecurring = mandatoryRecurring.length > 0;
  const showOptional = !isLumpSum && optional.length > 0;
  const showOnDemand = onDemand.length > 0;
  const showPhases = (meta.phases?.length ?? 0) > 0;
  const showTerms = (meta.terms?.length ?? 0) > 0;
  const showTechStack = (meta.techStack?.length ?? 0) > 0;

  let sectionCount = 0;
  const sectionNo = (visible: boolean) =>
    visible ? String(++sectionCount).padStart(2, "0") : "";
  const nItems = sectionNo(showItems);
  const nRecurring = sectionNo(showRecurring);
  const nOptional = sectionNo(showOptional);
  const nOnDemand = sectionNo(showOnDemand);
  const nPhases = sectionNo(showPhases);
  const nTerms = sectionNo(showTerms);
  const nTechStack = sectionNo(showTechStack);

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-40 bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] border-b border-border print:hidden">
        <Container className="max-w-[980px] h-16 flex items-center justify-between gap-3 px-5 sm:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <LogoLockup size={15} />
            <span className="hidden sm:block w-px h-[22px] bg-border" />
            <span className="hidden sm:block font-mono text-[13px] text-soft truncate">
              Preventivo ·{" "}
              <span className="text-foreground">{quote.client.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-[10px] shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="font-mono text-sm font-semibold px-[14px] py-[9px] rounded-[9px] border border-border text-foreground bg-transparent cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent max-[400px]:hidden"
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

      <Container className="max-w-[980px] px-5 sm:px-8 pt-14 pb-[100px]">
        {/* header */}
        <Reveal>
          <Eyebrow>
            preventivo · {quote.number}
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

        {/* 01 — voci (solo una tantum; lump-sum nasconde i prezzi qui) */}
        {showItems && (
          <div className="mt-14">
            <Reveal>
              <SectionTitle n={nItems}>Voci di lavoro</SectionTitle>
            </Reveal>
            <Reveal delay={60}>
              <div className="flex flex-col gap-[2px]">
                {mandatoryOneTime.map((item, i) => (
                  <div
                    key={item.id}
                    className={
                      i < mandatoryOneTime.length - 1
                        ? "border-b border-border"
                        : ""
                    }
                  >
                    <ItemLine item={item} hidePrice={isLumpSum} />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* 02 — manutenzione e canoni (sempre itemizzati, anche in lump-sum:
            un impegno ricorrente non può essere bundlato nel prezzo unico) */}
        {showRecurring && (
          <div className="mt-[52px]">
            <Reveal>
              <SectionTitle n={nRecurring}>Manutenzione e canoni</SectionTitle>
              <p className="font-hanken text-[14.5px] text-soft -mt-3 mb-[22px] max-w-[560px]">
                Servizi continuativi fatturati separatamente dall&rsquo;importo
                una tantum.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="flex flex-col gap-[2px]">
                {mandatoryRecurring.map((item, i) => (
                  <div
                    key={item.id}
                    className={
                      i < mandatoryRecurring.length - 1
                        ? "border-b border-border"
                        : ""
                    }
                  >
                    <ItemLine item={item} />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* 03 — moduli opzionali (mai in modalità prezzo unico) */}
        {showOptional && (
          <div className="mt-[52px]">
            <Reveal>
              <SectionTitle n={nOptional}>Moduli opzionali</SectionTitle>
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
            {/*
              Itemized: always show "Subtotale".
              Lump sum: hide the breakdown, but if there is a discount show the
              listino (strikethrough) + sconto so the saving is visible.
            */}
            {(!isLumpSum || hasDiscount) && (
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <span className="font-hanken text-[14.5px] text-soft">
                  {isLumpSum ? "Listino" : "Subtotale"}
                </span>
                <span
                  className={
                    isLumpSum
                      ? "font-mono text-[14.5px] text-muted line-through whitespace-nowrap"
                      : "font-mono text-[14.5px] text-foreground whitespace-nowrap"
                  }
                >
                  {formatMoney(calc.oneTimeSubtotal)}
                </span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <span className="font-hanken text-[14.5px] text-soft">Sconto</span>
                <span className="font-mono text-[14.5px] text-[var(--coral)] whitespace-nowrap">
                  −{formatMoney(calc.discount)}
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 mb-4 pb-4 border-b border-border">
              {isOccasional ? (
                <span className="font-hanken text-[14.5px] text-soft">
                  Fuori campo IVA
                </span>
              ) : (
                <>
                  <span className="font-hanken text-[14.5px] text-soft">{vatLabel}</span>
                  <span className="font-mono text-[14.5px] text-soft whitespace-nowrap">
                    {formatMoney(calc.vat)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-space text-lg font-semibold text-foreground">
                Totale
              </span>
              <span className="font-space text-[26px] font-bold text-accent tracking-[-0.02em] whitespace-nowrap">
                {formatMoney(calc.oneTimeTotal)}
              </span>
            </div>
            {(calc.monthlyRecurring.amountCents > 0 ||
              calc.yearlyRecurring.amountCents > 0) && (
              <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3">
                {calc.monthlyRecurring.amountCents > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-hanken text-[14.5px] text-soft">
                      Canoni ricorrenti
                    </span>
                    <span className="font-mono text-[14.5px] text-foreground whitespace-nowrap">
                      {formatMoney(calc.monthlyRecurring)} /mese
                    </span>
                  </div>
                )}
                {calc.yearlyRecurring.amountCents > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-hanken text-[14.5px] text-soft">
                      Canoni ricorrenti
                    </span>
                    <span className="font-mono text-[14.5px] text-foreground whitespace-nowrap">
                      {formatMoney(calc.yearlyRecurring)} /anno
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {isOccasional && (
          <Reveal delay={80}>
            <p className="mt-4 ml-auto max-w-[420px] font-hanken text-[12.5px] leading-relaxed text-muted">
              Operazione fuori campo IVA — prestazione occasionale ai sensi
              dell&rsquo;art. 67 TUIR. L&rsquo;importo indicato è il compenso lordo;
              se il committente è sostituto d&rsquo;imposta, è soggetto a ritenuta
              d&rsquo;acconto del 20%. Marca da bollo da €2 sulla ricevuta per
              importi superiori a €77,47.
            </p>
          </Reveal>
        )}

        {/* interventi a chiamata — prezzi di partenza, mai inclusi nel totale */}
        {showOnDemand && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n={nOnDemand}>Interventi a chiamata</SectionTitle>
              <p className="font-hanken text-[14.5px] text-soft -mt-3 mb-[22px] max-w-[560px]">
                Lavoro evolutivo su richiesta, valutato di volta in volta. I
                prezzi sono una base di partenza e <strong>non sono inclusi nel
                totale</strong>: paghi solo ciò che attivi, quando lo attivi.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="flex flex-col gap-[2px]">
                {onDemand.map((item, i) => (
                  <div
                    key={item.id}
                    className={
                      i < onDemand.length - 1 ? "border-b border-border" : ""
                    }
                  >
                    <ItemLine item={item} />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}

        {/* 03 — tempi */}
        {showPhases && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n={nPhases}>Tempi</SectionTitle>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-4 max-[820px]:grid-cols-2 gap-4">
                {meta.phases?.map((phase, i) => (
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
        {showTerms && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n={nTerms}>Termini</SectionTitle>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-[18px]">
                {meta.terms?.map((term) => (
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
        {showTechStack && (
          <div className="mt-16">
            <Reveal>
              <SectionTitle n={nTechStack}>Stack tecnico</SectionTitle>
              <p className="font-hanken text-[14.5px] text-soft -mt-3 mb-[22px] max-w-[560px]">
                Le tecnologie scelte per il tuo progetto — e perché contano.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="grid grid-cols-3 max-[820px]:grid-cols-2 gap-3">
                {meta.techStack?.map((entry) => (
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
              {quote.number} · info@7eightdev.com · domande? rispondi alla mail
            </span>
          </div>
        </div>
      </Container>
    </>
  );
}
