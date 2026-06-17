"use client";

import { useMemo, useState, useTransition } from "react";
import { LayoutGrid } from "lucide-react";
import {
  createQuoteAction,
  updateQuoteAction,
} from "@/application/quote/admin.actions";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import type { Quote } from "@/domain/quote/quote.types";
import {
  type FiscalRegime,
  netAfterWithholding,
  OCCASIONAL_WITHHOLDING_RATE,
} from "@/domain/quote/fiscal";
import { formatMoney, moneyFromUnits, sum } from "@/domain/shared/money";
import { cn } from "@/presentation/lib/utils";
import {
  makePair,
  PairListEditor,
  type Pair,
} from "@/presentation/features/admin/pair-list-editor";
import {
  DragHandle,
  SortableList,
} from "@/presentation/components/shared/sortable-list";

/* ----------------------------- types ------------------------------ */

interface LineItemDraft {
  key: string;
  catalogRef?: string;
  title: string;
  description: string;
  priceUnits: number;
  quantity: number;
  optional: boolean;
  type: "one_time" | "recurring";
  interval?: "monthly" | "yearly";
}

type DiscountKind = "none" | "percent" | "fixed";

interface QuoteComposerProps {
  catalog: readonly ServiceCatalogItem[];
  /** When provided, the composer edits this (draft) quote instead of creating one. */
  quote?: Quote;
}

type StepId = "info" | "items" | "details" | "terms";

/* ----------------- initial state (create vs edit) ----------------- */

interface InitialState {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  project: string;
  intro: string;
  validUntil: string;
  fiscalRegime: FiscalRegime;
  vatPercent: number;
  items: LineItemDraft[];
  phases: Pair[];
  terms: Pair[];
  techStack: Pair[];
  /** Per-quote visibility of optional sections on the public page. */
  showPhases: boolean;
  showTerms: boolean;
  showTechStack: boolean;
  timelineNote: string;
  discountKind: DiscountKind;
  discountValue: number;
  /** Presentation-only: single all-inclusive price vs. per-line breakdown. */
  pricingDisplay: "itemized" | "lump_sum";
}

function pairsFrom<T>(
  source: readonly T[] | undefined,
  map: (x: T) => Pair,
  fallback: Pair[]
): Pair[] {
  return source && source.length > 0 ? source.map(map) : fallback;
}

/** Maps a persisted Quote back into editable composer state. */
function quoteToState(quote: Quote): InitialState {
  const meta = quote.metadata;
  const discount = meta.discount;
  return {
    clientName: quote.client.name,
    clientCompany: quote.client.company ?? "",
    clientEmail: quote.client.email ?? "",
    project: quote.project,
    intro: quote.intro,
    validUntil: quote.validUntil.slice(0, 10),
    fiscalRegime: quote.fiscalRegime,
    vatPercent: Math.round(quote.vatRate * 100),
    items: quote.lineItems.map((li) => ({
      key: nextKey(),
      catalogRef: li.catalogRef,
      title: li.title,
      description: li.description,
      priceUnits: li.unitPrice.amountCents / 100,
      quantity: li.quantity ?? 1,
      optional: li.optional,
      type: li.type,
      interval: li.type === "recurring" ? li.interval : undefined,
    })),
    phases: pairsFrom(
      meta.phases,
      (p) => makePair(p.title, p.weeks),
      DEFAULT_PHASES
    ),
    terms: pairsFrom(meta.terms, (t) => makePair(t.label, t.body), DEFAULT_TERMS),
    techStack: pairsFrom(
      meta.techStack,
      (t) => makePair(t.label, t.technology),
      DEFAULT_STACK
    ),
    // Section is "shown" iff the saved quote actually carried its data.
    showPhases: (meta.phases?.length ?? 0) > 0,
    showTerms: (meta.terms?.length ?? 0) > 0,
    showTechStack: (meta.techStack?.length ?? 0) > 0,
    timelineNote: meta.timelineNote ?? "",
    discountKind: discount ? discount.kind : "none",
    discountValue: discount
      ? discount.kind === "percent"
        ? Math.round(discount.value * 100)
        : discount.amount.amountCents / 100
      : 0,
    pricingDisplay: meta.pricingDisplay ?? "itemized",
  };
}

function blankState(): InitialState {
  return {
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    project: "",
    intro: "",
    validUntil: defaultValidUntil(),
    // Default regime: prestazione occasionale (current operating status).
    fiscalRegime: "occasional",
    vatPercent: 0,
    items: [],
    phases: DEFAULT_PHASES,
    terms: DEFAULT_TERMS,
    techStack: DEFAULT_STACK,
    // Defaults: fasi e termini visibili, stack tecnico nascosto (target non tecnico).
    showPhases: true,
    showTerms: true,
    showTechStack: false,
    timelineNote: "",
    discountKind: "none",
    discountValue: 0,
    pricingDisplay: "itemized",
  };
}

/* ---------------------------- defaults ---------------------------- */

const DEFAULT_TERMS: Pair[] = [
  makePair("Pagamento", "40% all’avvio · 30% a metà progetto · 30% alla consegna."),
  makePair("Cosa serve da te", "Contenuti (testi, logo, immagini) e un referente per le approvazioni."),
  makePair("Incluso", "Codice sorgente tuo, documentazione e 3 mesi di assistenza post-lancio."),
];

const DEFAULT_STACK: Pair[] = [
  makePair("Framework", "Next.js 16 + React 19"),
  makePair("Linguaggio", "TypeScript (strict)"),
  makePair("Qualità", "Jest · Playwright · CI/CD"),
];

const DEFAULT_PHASES: Pair[] = [
  makePair("Discovery", "Sett. 1"),
  makePair("Design", "Sett. 2–3"),
  makePair("Sviluppo", "Sett. 4–7"),
  makePair("Lancio", "Sett. 8"),
];

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function catalogPriceUnits(item: ServiceCatalogItem): number {
  switch (item.pricing.kind) {
    case "fixed":
      return item.pricing.price.amountCents / 100;
    case "range":
      return item.pricing.from.amountCents / 100;
    case "on_request":
      return 0;
  }
}

function catalogPriceLabel(item: ServiceCatalogItem): string {
  switch (item.pricing.kind) {
    case "fixed":
      return formatMoney(item.pricing.price);
    case "range":
      return `da ${formatMoney(item.pricing.from)}`;
    case "on_request":
      return "su richiesta";
  }
}

/* ---------------------------- component --------------------------- */

let keyCounter = 0;
const nextKey = () => `li-${++keyCounter}`;

const inputClass =
  "px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim w-full";

const labelClass =
  "font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-[6px] block";

/** Checkbox that toggles whether an optional section is shown on the public quote. */
function SectionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        className="w-3.5 h-3.5 accent-accent"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
        Mostra «{label}» al cliente
      </span>
    </label>
  );
}

export function QuoteComposer({ catalog, quote }: QuoteComposerProps) {
  const isEdit = !!quote;
  const [initial] = useState<InitialState>(() =>
    quote ? quoteToState(quote) : blankState()
  );
  const [step, setStep] = useState<StepId>("info");
  const [clientName, setClientName] = useState(initial.clientName);
  const [clientCompany, setClientCompany] = useState(initial.clientCompany);
  const [clientEmail, setClientEmail] = useState(initial.clientEmail);
  const [project, setProject] = useState(initial.project);
  const [intro, setIntro] = useState(initial.intro);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime>(
    initial.fiscalRegime
  );
  const [vatPercent, setVatPercent] = useState(initial.vatPercent);
  const [items, setItems] = useState<LineItemDraft[]>(initial.items);
  const [phases, setPhases] = useState<Pair[]>(initial.phases);
  const [terms, setTerms] = useState<Pair[]>(initial.terms);
  const [techStack, setTechStack] = useState<Pair[]>(initial.techStack);
  const [showPhases, setShowPhases] = useState(initial.showPhases);
  const [showTerms, setShowTerms] = useState(initial.showTerms);
  const [showTechStack, setShowTechStack] = useState(initial.showTechStack);
  const [timelineNote, setTimelineNote] = useState(initial.timelineNote);
  const [tier, setTier] = useState<"web_assets" | "enterprise">("web_assets");
  // Mobile-only: the catalog is collapsed by default and opened via the toggle
  // next to "+ Voce libera". On desktop (lg+) it lives in the sidebar, always visible.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [discountKind, setDiscountKind] = useState<DiscountKind>(
    initial.discountKind
  );
  const [discountValue, setDiscountValue] = useState(initial.discountValue);
  const [pricingDisplay, setPricingDisplay] = useState<"itemized" | "lump_sum">(
    initial.pricingDisplay
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lump-sum is an all-inclusive fixed price: optional line items make no
  // sense (decision 1), so the per-item "Opzionale" toggle is disabled and
  // every item is forced mandatory on submit.
  const isLumpSum = pricingDisplay === "lump_sum";

  const addFromCatalog = (item: ServiceCatalogItem) => {
    const recurring = item.billing.kind === "recurring";
    setItems((prev) => {
      // A catalog item can only appear once per quote: ignore re-adds.
      if (prev.some((i) => i.catalogRef === item.id)) return prev;
      return [
        ...prev,
        {
          key: nextKey(),
          catalogRef: item.id,
          title: item.title,
          description: item.description,
          priceUnits: catalogPriceUnits(item),
          quantity: 1,
          optional: item.defaultOptional,
          type: recurring ? "recurring" : "one_time",
          interval: recurring ? item.billing.interval : undefined,
        },
      ];
    });
  };

  const addFreeItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        title: "",
        description: "",
        priceUnits: 0,
        quantity: 1,
        optional: false,
        type: "one_time",
      },
    ]);
  };

  const updateItem = (key: string, patch: Partial<LineItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const totals = useMemo(() => {
    const lineNet = (i: LineItemDraft) =>
      moneyFromUnits((i.priceUnits || 0) * (i.quantity || 1));
    const oneTime = items.filter((i) => i.type === "one_time");
    const net = sum(oneTime.map(lineNet));
    const optionalNet = sum(oneTime.filter((i) => i.optional).map(lineNet));
    const monthly = sum(
      items
        .filter((i) => i.type === "recurring" && i.interval === "monthly")
        .map(lineNet)
    );
    const discount =
      discountKind === "percent"
        ? moneyFromUnits(
            (net.amountCents / 100) * Math.min(Math.max(discountValue, 0), 100) / 100
          )
        : discountKind === "fixed"
          ? moneyFromUnits(Math.min(discountValue, net.amountCents / 100))
          : moneyFromUnits(0);
    const netAfterDiscount = moneyFromUnits(
      Math.max(0, net.amountCents / 100 - discount.amountCents / 100)
    );
    return { net, optionalNet, monthly, discount, netAfterDiscount };
  }, [items, discountKind, discountValue]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = {
        clientName,
        clientCompany,
        clientEmail,
        project,
        intro,
        validUntil,
        fiscalRegime,
        vatRate: fiscalRegime === "occasional" ? 0 : vatPercent / 100,
        lineItems: items.map((item) => ({
          catalogRef: item.catalogRef,
          title: item.title,
          description: item.description,
          priceUnits: item.priceUnits,
          quantity: item.quantity || 1,
          // In lump-sum mode there are no optional items: everything is included.
          optional: isLumpSum ? false : item.optional,
          type: item.type,
          interval: item.interval,
        })),
        phases: showPhases ? phases.filter((p) => p.a && p.b) : [],
        terms: showTerms ? terms.filter((t) => t.a && t.b) : [],
        techStack: showTechStack ? techStack.filter((t) => t.a && t.b) : [],
        timelineNote,
        discount:
          discountKind === "percent"
            ? { kind: "percent" as const, value: discountValue }
            : discountKind === "fixed"
              ? { kind: "fixed" as const, amountUnits: discountValue }
              : undefined,
        pricingDisplay,
      };
      const result = quote
        ? await updateQuoteAction(quote.id, payload)
        : await createQuoteAction(payload);
      if (result && !result.ok) setError(result.error ?? "Errore.");
    });
  };

  const steps: { id: StepId; label: string }[] = [
    { id: "info", label: "1. Info" },
    { id: "items", label: "2. Voci" },
    { id: "details", label: "3. Roadmap" },
    { id: "terms", label: "4. Termini" },
  ];

  const nextStep = () => {
    if (step === "info") setStep("items");
    else if (step === "items") setStep("details");
    else if (step === "details") setStep("terms");
  };

  const visibleCatalog = catalog.filter((item) => item.tier === tier);
  const addedRefs = useMemo(
    () => new Set(items.map((i) => i.catalogRef).filter(Boolean) as string[]),
    [items]
  );

  return (
    <div className="flex flex-col gap-10 pb-24 sm:pb-0">
      {/* ── stepper (full width and redesigned) ── */}
      <nav className="relative flex justify-center items-start w-full mb-4">
        {/* Line background - spans from first to last circle center */}
        <div className="absolute top-[18px] left-[12.5%] right-[12.5%] h-[1px] bg-border z-0" />
        
        {steps.map((s, idx) => {
          const isActive = step === s.id;
          const isPast = steps.findIndex(x => x.id === step) > idx;
          
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className="relative z-10 flex flex-col items-center flex-1 group"
            >
              {/* Circle with number */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center font-mono text-[13px] font-bold border transition-all duration-200",
                isActive 
                  ? "bg-accent text-[#0a0b0d] border-accent shadow-[0_0_15px_rgba(199,249,78,0.2)]" 
                  : isPast
                    ? "bg-raised text-accent border-accent"
                    : "bg-surface text-muted border-border group-hover:border-soft group-hover:text-soft"
              )}>
                {idx + 1}
              </div>
              
              {/* Label below */}
              <span className={cn(
                "mt-3 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200",
                isActive ? "text-foreground font-bold" : "text-muted"
              )}>
                {s.label.split(". ")[1]}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 sm:gap-8 items-start">
        {/* ── form content ── */}
        <div className="flex flex-col gap-6 sm:gap-8">
          {step === "info" && (
            <section className="animate-fade-up p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
              <h2 className="font-space text-lg font-semibold text-foreground m-0">
                Cliente & progetto
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome cliente *</label>
                  <input className={inputClass} value={clientName} placeholder="AVIS Comunale"
                    onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Ragione sociale</label>
                  <input className={inputClass} value={clientCompany} placeholder="Bergamo — OdV"
                    onChange={(e) => setClientCompany(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={clientEmail} placeholder="referente@cliente.it"
                    onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Progetto *</label>
                  <input className={inputClass} value={project} placeholder="Nuovo sito + area donatori"
                    onChange={(e) => setProject(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Introduzione</label>
                <textarea className={`${inputClass} resize-y text-[13px]`} rows={3} value={intro}
                  placeholder="Inquadra la proposta per il cliente."
                  onChange={(e) => setIntro(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valido fino al *</label>
                  <input className={inputClass} type="date" value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Regime fiscale</label>
                  <div className="flex items-center gap-2">
                    {([
                      { v: "occasional", label: "Prest. occasionale" },
                      { v: "vat", label: "IVA" },
                    ] as const).map((r) => (
                      <button key={r.v} type="button"
                        onClick={() => {
                          setFiscalRegime(r.v);
                          if (r.v === "occasional") setVatPercent(0);
                          else if (vatPercent === 0) setVatPercent(22);
                        }}
                        className={cn(
                          "font-mono text-[11px] px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          fiscalRegime === r.v ? "border-accent text-accent" : "border-border text-muted hover:text-soft"
                        )}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {fiscalRegime === "vat" ? (
                <div className="sm:max-w-[12rem]">
                  <label className={labelClass}>IVA %</label>
                  <input className={inputClass} type="number" min={0} max={100} value={vatPercent}
                    onChange={(e) => setVatPercent(Number(e.target.value))} />
                </div>
              ) : (
                <p className="font-mono text-[11px] text-muted m-0">
                  Operazione fuori campo IVA (art. 67 TUIR) · la nota fiscale completa
                  appare in automatico sul preventivo pubblico.
                </p>
              )}
              <div className="hidden sm:block pt-6 border-t border-border mt-6">
                <button type="button" onClick={() => setStep("items")}
                  className="font-mono text-sm font-semibold px-5 py-3 rounded-lg bg-raised border border-border text-soft hover:text-foreground hover:border-accent transition-all">
                  Prossimo step: Voci →
                </button>
              </div>
            </section>
          )}

          {step === "items" && (
            <div className="flex flex-col gap-6 sm:gap-8">
              {/* Su mobile il catalogo è collassabile, aperto dal toggle accanto a "+ Voce libera" */}
              {catalogOpen && (
                <div className="lg:hidden animate-fade-up">
                  <CatalogSidebar
                    tier={tier}
                    setTier={setTier}
                    visibleCatalog={visibleCatalog}
                    addFromCatalog={addFromCatalog}
                    addedRefs={addedRefs}
                    compact={true}
                  />
                </div>
              )}

              <section className="animate-fade-up p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-space text-lg font-semibold text-foreground m-0">
                    Voci di lavoro
                  </h2>
                  <button type="button" onClick={() => setCatalogOpen((o) => !o)}
                    aria-expanded={catalogOpen}
                    aria-label={catalogOpen ? "Chiudi catalogo servizi" : "Apri catalogo servizi"}
                    className={cn(
                      "lg:hidden inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150",
                      catalogOpen
                        ? "border-accent text-accent"
                        : "border-border text-soft hover:border-accent hover:text-accent"
                    )}>
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                    Catalogo
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="font-hanken text-sm text-muted m-0 italic py-4">
                    Seleziona servizi dal catalogo o aggiungi una voce libera.
                  </p>
                ) : (
                  <SortableList
                    items={items}
                    getId={(i) => i.key}
                    onReorder={setItems}
                    className="flex flex-col gap-3"
                  >
                    {(item, handleProps) => (
                      <div className="p-4 rounded-xl bg-raised border border-border flex flex-col gap-3">
                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                          <DragHandle handleProps={handleProps} className="px-1 py-[10px]" />
                          <input className={inputClass} value={item.title} placeholder="Titolo voce *"
                            onChange={(e) => updateItem(item.key, { title: e.target.value })} />
                          <button type="button" onClick={() => removeItem(item.key)}
                            className="font-mono text-sm text-muted px-2 py-2.5 cursor-pointer hover:text-[var(--coral)] transition-colors"
                            title="Rimuovi voce" aria-label="Rimuovi voce">
                            ×
                          </button>
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="w-[96px] shrink-0">
                            <label className={`${labelClass} whitespace-nowrap`}>Quantità</label>
                            <input className={inputClass} type="number" min={1} value={item.quantity}
                              aria-label="Quantità"
                              onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className={`${labelClass} whitespace-nowrap`}>Prezzo unit. (€)</label>
                            <input className={inputClass} type="number" min={0} value={item.priceUnits}
                              aria-label="Prezzo unitario (€)"
                              onChange={(e) => updateItem(item.key, { priceUnits: Number(e.target.value) })} />
                          </div>
                        </div>
                        {item.quantity > 1 && (
                          <p className="font-mono text-[11px] text-muted m-0 -mt-1">
                            {item.quantity} × {formatMoney(moneyFromUnits(item.priceUnits || 0))} ={" "}
                            <span className="text-soft">
                              {formatMoney(moneyFromUnits((item.priceUnits || 0) * item.quantity))}
                            </span>
                            {item.type === "recurring" && (item.interval === "yearly" ? " /anno" : " /mese")}
                          </p>
                        )}
                        <textarea className={`${inputClass} resize-y text-[13px] min-h-[88px]`} rows={4} value={item.description}
                          placeholder="Descrizione per il cliente"
                          onChange={(e) => updateItem(item.key, { description: e.target.value })} />
                        <div className="flex items-center gap-3 flex-wrap">
                          <label
                            title={isLumpSum ? "Disattivato in modalità prezzo unico: tutto è incluso." : undefined}
                            className={cn(
                              "flex items-center gap-2 font-hanken text-[12px] text-soft bg-surface/50 px-2 py-1 rounded-md border border-border/50",
                              isLumpSum ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            )}>
                            <input type="checkbox" checked={isLumpSum ? false : item.optional}
                              disabled={isLumpSum}
                              className="w-3.5 h-3.5 accent-accent"
                              onChange={(e) => updateItem(item.key, { optional: e.target.checked })} />
                            Opzionale
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-hanken text-[12px] text-soft bg-surface/50 px-2 py-1 rounded-md border border-border/50">
                            <input type="checkbox" checked={item.type === "recurring"}
                              className="w-3.5 h-3.5 accent-accent"
                              onChange={(e) =>
                                updateItem(item.key, {
                                  type: e.target.checked ? "recurring" : "one_time",
                                  interval: e.target.checked ? (item.interval ?? "monthly") : undefined,
                                })
                              } />
                            Ricorrente
                          </label>
                        </div>
                      </div>
                    )}
                  </SortableList>
                )}
                <button type="button" onClick={addFreeItem}
                  className="self-end font-mono text-xs font-semibold text-soft px-3 py-2 rounded-lg border border-border cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent">
                  + Voce libera
                </button>
                <div className="hidden sm:flex gap-3 pt-6 border-t border-border mt-6">
                  <button type="button" onClick={() => setStep("info")}
                    className="font-mono text-xs font-semibold px-4 py-3 rounded-lg border border-border text-muted hover:text-soft transition-all">
                    ← Info
                  </button>
                  <button type="button" onClick={() => setStep("details")}
                    className="font-mono text-sm font-semibold px-5 py-3 rounded-lg bg-raised border border-border text-soft hover:text-foreground hover:border-accent transition-all">
                    Roadmap & Stack →
                  </button>
                </div>
              </section>
            </div>
          )}

          {step === "details" && (
            <section className="animate-fade-up p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6">
              <h2 className="font-space text-lg font-semibold text-foreground m-0">
                Tempi & stack tecnico
              </h2>
              <div className="flex flex-col gap-4">
                <SectionToggle label="Fasi / timeline" checked={showPhases} onChange={setShowPhases} />
                {showPhases && (
                  <>
                    <PairListEditor label="Fasi (timeline)" aPlaceholder="Discovery" bPlaceholder="Sett. 1"
                      value={phases} onChange={setPhases} />
                    <div>
                      <label className={labelClass}>Nota timeline</label>
                      <input className={inputClass} value={timelineNote}
                        placeholder="Stima complessiva: ~8 settimane dall’avvio."
                        onChange={(e) => setTimelineNote(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-4 mt-4">
                <SectionToggle label="Stack tecnico" checked={showTechStack} onChange={setShowTechStack} />
                {showTechStack && (
                  <PairListEditor label="Stack tecnico" aPlaceholder="Framework" bPlaceholder="Next.js 16"
                    value={techStack} onChange={setTechStack} />
                )}
              </div>
              <div className="hidden sm:flex gap-3 pt-6 border-t border-border mt-6">
                <button type="button" onClick={() => setStep("items")}
                  className="font-mono text-xs font-semibold px-4 py-3 rounded-lg border border-border text-muted hover:text-soft transition-all">
                  ← Voci
                </button>
                <button type="button" onClick={() => setStep("terms")}
                  className="font-mono text-sm font-semibold px-5 py-3 rounded-lg bg-raised border border-border text-soft hover:text-foreground hover:border-accent transition-all">
                  Termini & Invio →
                </button>
              </div>
            </section>
          )}

          {step === "terms" && (
            <section className="animate-fade-up p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6">
              <h2 className="font-space text-lg font-semibold text-foreground m-0">
                Termini contrattuali
              </h2>
              <div className="flex flex-col gap-4">
                <SectionToggle label="Termini" checked={showTerms} onChange={setShowTerms} />
                {showTerms && (
                  <PairListEditor label="Termini" aPlaceholder="Pagamento" bPlaceholder="40/30/30…"
                    value={terms} onChange={setTerms} bMultiline />
                )}
              </div>

              <div>
                <label className={labelClass}>Sconto commerciale</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["none", "percent", "fixed"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setDiscountKind(k)}
                      className={cn(
                        "font-mono text-[11px] px-3 py-2 rounded-lg border cursor-pointer transition-all",
                        discountKind === k ? "border-accent text-accent" : "border-border text-muted hover:text-soft"
                      )}>
                      {k === "none" ? "Nessuno" : k === "percent" ? "Percentuale" : "Importo fisso"}
                    </button>
                  ))}
                  {discountKind !== "none" && (
                    <div className="flex items-center gap-1">
                      <input className={`${inputClass} w-[110px]`} type="number" min={0}
                        max={discountKind === "percent" ? 100 : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))} />
                      <span className="font-mono text-sm text-muted">
                        {discountKind === "percent" ? "%" : "€"}
                      </span>
                    </div>
                  )}
                </div>
                {totals.discount.amountCents > 0 && (
                  <p className="font-mono text-[12px] text-soft mt-2 m-0">
                    Sconto applicato: −{formatMoney(totals.discount)} · netto{" "}
                    {formatMoney(totals.netAfterDiscount)}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-raised border border-border p-3 flex flex-col gap-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLumpSum}
                    className="w-3.5 h-3.5 mt-0.5 accent-accent"
                    onChange={(e) =>
                      setPricingDisplay(e.target.checked ? "lump_sum" : "itemized")
                    }
                  />
                  <span className="font-hanken text-[13px] text-foreground leading-snug">
                    Mostra prezzo unico{" "}
                    <span className="text-soft">
                      (nascondi i prezzi delle singole voci)
                    </span>
                  </span>
                </label>
                {isLumpSum && (
                  <p className="font-mono text-[11px] text-muted m-0 pl-[22px]">
                    Le voci appaiono solo come elenco descrittivo, con un unico
                    totale una tantum. I moduli opzionali sono disattivati (prezzo
                    tutto incluso); eventuale sconto mostrato come listino barrato.
                    Il canone ricorrente resta una riga a parte.
                  </p>
                )}
              </div>

              {fiscalRegime === "occasional" && (
                <div className="rounded-lg bg-raised border border-border p-3">
                  <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted m-0 mb-1">
                    Promemoria interno (non visibile al cliente)
                  </p>
                  <p className="font-mono text-[12px] text-soft m-0">
                    Lordo {formatMoney(totals.netAfterDiscount)} · ritenuta{" "}
                    {Math.round(OCCASIONAL_WITHHOLDING_RATE * 100)}% → netto a te{" "}
                    {formatMoney(
                      moneyFromUnits(
                        netAfterWithholding(
                          totals.netAfterDiscount.amountCents,
                          "occasional"
                        ) / 100
                      )
                    )}
                  </p>
                </div>
              )}

              {error && (
                <p className="font-hanken text-sm text-[var(--coral)] m-0" role="alert">
                  {error}
                </p>
              )}

              <div className="hidden sm:flex gap-4 items-center pt-6 border-t border-border mt-6">
                <button type="button" onClick={() => setStep("details")}
                  className="font-mono text-xs font-semibold px-4 py-3 rounded-lg border border-border text-muted hover:text-soft transition-all">
                  ← Roadmap
                </button>
                {/* In edit mode the persistent sidebar save covers this; avoid a duplicate. */}
                {!isEdit && (
                  <button type="button" onClick={submit} disabled={pending || items.length === 0}
                    className={cn(
                      "flex-1 font-mono text-[15px] font-semibold px-6 py-[14px] rounded-[9px] transition-all duration-150",
                      pending || items.length === 0
                        ? "bg-raised text-muted cursor-not-allowed"
                        : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
                    )}>
                    {pending ? "Salvataggio…" : "Crea bozza preventivo →"}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-5 sticky top-24">
          {/* In edit mode the save action is always reachable, on every step. */}
          {isEdit && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={pending || items.length === 0}
                className={cn(
                  "font-mono text-sm font-semibold px-5 py-3 rounded-xl transition-all duration-150",
                  pending || items.length === 0
                    ? "bg-raised text-muted cursor-not-allowed border border-border"
                    : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
                )}
              >
                {pending ? "Salvataggio…" : "Salva modifiche"}
              </button>
              {error && (
                <p className="font-hanken text-[13px] text-[var(--coral)] m-0" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
          {step === "items" ? (
            <CatalogSidebar
              tier={tier}
              setTier={setTier}
              visibleCatalog={visibleCatalog}
              addFromCatalog={addFromCatalog}
              addedRefs={addedRefs}
            />
          ) : (
            <div className="p-5 rounded-2xl bg-surface border border-border">
              <h2 className="font-space text-[14px] font-semibold text-foreground mb-4 m-0">
                Riepilogo bozza
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] text-soft">Cliente</span>
                  <span className="text-[12px] text-foreground font-medium truncate max-w-[140px]">
                    {clientName || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] text-soft">Progetto</span>
                  <span className="text-[12px] text-foreground font-medium truncate max-w-[140px]">
                    {project || "—"}
                  </span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] text-soft">Voci incluse</span>
                  <span className="text-[12px] text-foreground font-mono">{items.length}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-surface border border-border">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-hanken text-sm text-soft">Netto una tantum</span>
              <span className="font-mono text-[15px] text-foreground">
                {formatMoney(totals.net)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-hanken text-sm text-soft">di cui opzionali</span>
              <span className="font-mono text-sm text-muted">
                {formatMoney(totals.optionalNet)}
              </span>
            </div>
            {totals.discount.amountCents > 0 && (
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-hanken text-sm text-soft">Sconto</span>
                <span className="font-mono text-sm text-[var(--coral)]">
                  −{formatMoney(totals.discount)}
                </span>
              </div>
            )}
            {totals.monthly.amountCents > 0 && (
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border">
                <span className="font-hanken text-sm text-soft">Ricorrente</span>
                <span className="font-mono text-sm text-accent">
                  {formatMoney(totals.monthly)} /mese
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── mobile sticky footer ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-surface/80 backdrop-blur-xl border-t border-border flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">Netto</span>
          <span className="text-[16px] font-mono font-bold text-accent">{formatMoney(totals.net)}</span>
        </div>
        
        {/* In edit mode, save is always available; create keeps its guided flow. */}
        {isEdit || step === "terms" ? (
          <button type="button" onClick={submit} disabled={pending || items.length === 0}
            className={cn(
              "px-6 py-3 rounded-xl font-mono text-sm font-bold transition-all",
              pending || items.length === 0 ? "bg-raised text-muted" : "bg-accent text-[#0a0b0d]"
            )}>
            {pending ? "..." : isEdit ? "Salva" : "Crea bozza"}
          </button>
        ) : (
          <button type="button" onClick={nextStep}
            className="px-6 py-3 rounded-xl bg-raised border border-border text-foreground font-mono text-sm font-bold hover:border-accent">
            Avanti →
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- sub-components --------------------------- */

function CatalogSidebar({
  tier,
  setTier,
  visibleCatalog,
  addFromCatalog,
  addedRefs,
  compact = false,
}: {
  tier: "web_assets" | "enterprise",
  setTier: (t: "web_assets" | "enterprise") => void,
  visibleCatalog: readonly ServiceCatalogItem[],
  addFromCatalog: (item: ServiceCatalogItem) => void,
  addedRefs: ReadonlySet<string>,
  compact?: boolean
}) {
  return (
    <div className={cn("rounded-2xl bg-surface border border-border flex flex-col", compact ? "p-4" : "p-5")}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-space text-[15px] font-semibold text-foreground m-0">
          Catalogo {compact && "servizi"}
        </h2>
        <div className="flex gap-1">
          {(["web_assets", "enterprise"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTier(t)}
              className={cn(
                "font-mono text-[10px] px-2 py-1 rounded-full border cursor-pointer transition-all",
                tier === t ? "border-accent text-accent" : "border-border text-muted"
              )}>
              {t === "web_assets" ? "PMI" : "Ent"}
            </button>
          ))}
        </div>
      </div>
      <div className={cn(
        "flex gap-2 custom-scrollbar",
        compact ? "flex-row overflow-x-auto no-scrollbar pb-2" : "flex-col max-h-[400px] overflow-y-auto pr-1"
      )}>
        {visibleCatalog.map((item) => {
          const added = addedRefs.has(item.id);
          return (
            <button key={item.id} type="button" disabled={added}
              onClick={() => addFromCatalog(item)}
              aria-disabled={added}
              title={added ? "Già aggiunto al preventivo" : undefined}
              className={cn(
                "text-left p-2.5 rounded-xl border transition-all group shrink-0",
                compact ? "w-[160px]" : "w-full",
                added
                  ? "bg-surface border-border/60 opacity-60 cursor-not-allowed"
                  : "bg-raised border-border cursor-pointer hover:border-accent"
              )}>
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "font-space text-[12px] font-semibold text-foreground transition-colors truncate",
                  added ? "" : "group-hover:text-accent"
                )}>
                  {item.title}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {added ? (
                    <span className="text-accent">✓ Aggiunto</span>
                  ) : (
                    <>
                      {catalogPriceLabel(item)}
                      {item.billing.kind === "recurring" &&
                        (item.billing.interval === "yearly" ? " /anno" : " /mese")}
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
