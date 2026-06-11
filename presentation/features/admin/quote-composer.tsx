"use client";

import { useMemo, useState, useTransition } from "react";
import { createQuoteAction } from "@/application/quote/admin.actions";
import type { ServiceCatalogItem } from "@/domain/catalog/catalog.types";
import { formatMoney, moneyFromUnits, sum } from "@/domain/shared/money";
import { cn } from "@/presentation/lib/utils";
import {
  PairListEditor,
  type Pair,
} from "@/presentation/features/admin/pair-list-editor";

/* ----------------------------- types ------------------------------ */

interface LineItemDraft {
  key: string;
  catalogRef?: string;
  title: string;
  description: string;
  priceUnits: number;
  optional: boolean;
  type: "one_time" | "recurring";
  interval?: "monthly" | "yearly";
}

interface QuoteComposerProps {
  catalog: readonly ServiceCatalogItem[];
}

/* ---------------------------- defaults ---------------------------- */

const DEFAULT_TERMS: Pair[] = [
  { a: "Pagamento", b: "40% all’avvio · 30% a metà progetto · 30% alla consegna." },
  { a: "Cosa serve da te", b: "Contenuti (testi, logo, immagini) e un referente per le approvazioni." },
  { a: "Incluso", b: "Codice sorgente tuo, documentazione e 3 mesi di assistenza post-lancio." },
];

const DEFAULT_STACK: Pair[] = [
  { a: "Framework", b: "Next.js 16 + React 19" },
  { a: "Linguaggio", b: "TypeScript (strict)" },
  { a: "Qualità", b: "Jest · Playwright · CI/CD" },
];

const DEFAULT_PHASES: Pair[] = [
  { a: "Discovery", b: "Sett. 1" },
  { a: "Design", b: "Sett. 2–3" },
  { a: "Sviluppo", b: "Sett. 4–7" },
  { a: "Lancio", b: "Sett. 8" },
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

export function QuoteComposer({ catalog }: QuoteComposerProps) {
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [project, setProject] = useState("");
  const [intro, setIntro] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [vatPercent, setVatPercent] = useState(22);
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [phases, setPhases] = useState<Pair[]>(DEFAULT_PHASES);
  const [terms, setTerms] = useState<Pair[]>(DEFAULT_TERMS);
  const [techStack, setTechStack] = useState<Pair[]>(DEFAULT_STACK);
  const [timelineNote, setTimelineNote] = useState("");
  const [tier, setTier] = useState<"web_assets" | "enterprise">("web_assets");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addFromCatalog = (item: ServiceCatalogItem) => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        catalogRef: item.id,
        title: item.title,
        description: item.description,
        priceUnits: catalogPriceUnits(item),
        optional: item.defaultOptional,
        type: "one_time",
      },
    ]);
  };

  const addFreeItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        title: "",
        description: "",
        priceUnits: 0,
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
    const included = items.filter((i) => i.type === "one_time");
    const net = sum(included.map((i) => moneyFromUnits(i.priceUnits || 0)));
    const optionalNet = sum(
      included
        .filter((i) => i.optional)
        .map((i) => moneyFromUnits(i.priceUnits || 0))
    );
    return { net, optionalNet };
  }, [items]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createQuoteAction({
        clientName,
        clientCompany,
        clientEmail,
        project,
        intro,
        validUntil,
        vatRate: vatPercent / 100,
        lineItems: items.map((item) => ({
          catalogRef: item.catalogRef,
          title: item.title,
          description: item.description,
          priceUnits: item.priceUnits,
          optional: item.optional,
          type: item.type,
          interval: item.interval,
        })),
        phases: phases.filter((p) => p.a && p.b),
        terms: terms.filter((t) => t.a && t.b),
        techStack: techStack.filter((t) => t.a && t.b),
        timelineNote,
      });
      // On success the action redirects; reaching here means failure.
      if (result && !result.ok) setError(result.error ?? "Errore.");
    });
  };

  const visibleCatalog = catalog.filter((item) => item.tier === tier);

  return (
    <div className="grid grid-cols-[1fr_340px] max-[1000px]:grid-cols-1 gap-8 items-start">
      {/* ── form ── */}
      <div className="flex flex-col gap-8">
        {/* cliente & progetto */}
        <section className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
          <h2 className="font-space text-lg font-semibold text-foreground m-0">
            Cliente & progetto
          </h2>
          <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Nome cliente *</label>
              <input className={inputClass} value={clientName} placeholder="AVIS Comunale"
                onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Ragione sociale</label>
              <input className={inputClass} value={clientCompany} placeholder="AVIS Comunale di Bergamo — OdV"
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
            <textarea className={`${inputClass} resize-y`} rows={3} value={intro}
              placeholder="Due righe che inquadrano la proposta, in linguaggio del cliente."
              onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 max-[820px]:grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Valido fino al *</label>
              <input className={inputClass} type="date" value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>IVA %</label>
              <input className={inputClass} type="number" min={0} max={100} value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))} />
            </div>
          </div>
        </section>

        {/* voci */}
        <section className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-space text-lg font-semibold text-foreground m-0">
              Voci di lavoro
            </h2>
            <button type="button" onClick={addFreeItem}
              className="font-mono text-xs font-semibold text-soft px-3 py-2 rounded-lg border border-border cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent">
              + Voce libera
            </button>
          </div>

          {items.length === 0 && (
            <p className="font-hanken text-sm text-muted m-0">
              Aggiungi voci dal catalogo a destra o crea una voce libera.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.key}
                className="p-4 rounded-xl bg-raised border border-border flex flex-col gap-3">
                <div className="grid grid-cols-[1fr_130px_auto] gap-3 items-start">
                  <input className={inputClass} value={item.title} placeholder="Titolo voce *"
                    onChange={(e) => updateItem(item.key, { title: e.target.value })} />
                  <input className={inputClass} type="number" min={0} value={item.priceUnits}
                    aria-label="Prezzo (EUR, netto)"
                    onChange={(e) => updateItem(item.key, { priceUnits: Number(e.target.value) })} />
                  <button type="button" aria-label="Rimuovi voce" onClick={() => removeItem(item.key)}
                    className="font-mono text-sm text-muted px-3 py-[10px] cursor-pointer hover:text-[var(--coral)]">
                    ×
                  </button>
                </div>
                <textarea className={`${inputClass} resize-y`} rows={2} value={item.description}
                  placeholder="Descrizione in linguaggio del cliente"
                  onChange={(e) => updateItem(item.key, { description: e.target.value })} />
                <div className="flex items-center gap-5 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer font-hanken text-[13.5px] text-soft">
                    <input type="checkbox" checked={item.optional}
                      className="w-4 h-4 accent-[var(--accent)]"
                      onChange={(e) => updateItem(item.key, { optional: e.target.checked })} />
                    Modulo opzionale (attivabile dal cliente)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-hanken text-[13.5px] text-soft">
                    <input type="checkbox" checked={item.type === "recurring"}
                      className="w-4 h-4 accent-[var(--accent)]"
                      onChange={(e) =>
                        updateItem(item.key, {
                          type: e.target.checked ? "recurring" : "one_time",
                          interval: e.target.checked ? (item.interval ?? "monthly") : undefined,
                        })
                      } />
                    Ricorrente
                  </label>
                  {item.type === "recurring" && (
                    <select value={item.interval ?? "monthly"}
                      className={`${inputClass} w-auto`}
                      onChange={(e) =>
                        updateItem(item.key, { interval: e.target.value as "monthly" | "yearly" })
                      }>
                      <option value="monthly">mensile</option>
                      <option value="yearly">annuale</option>
                    </select>
                  )}
                  {item.catalogRef && (
                    <span className="font-mono text-[11px] text-muted ml-auto">
                      catalogo: {item.catalogRef}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* metadata */}
        <section className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-6">
          <h2 className="font-space text-lg font-semibold text-foreground m-0">
            Tempi, termini & stack
          </h2>
          <PairListEditor label="Fasi (timeline)" aPlaceholder="Discovery" bPlaceholder="Sett. 1"
            value={phases} onChange={setPhases} />
          <div>
            <label className={labelClass}>Nota timeline</label>
            <input className={inputClass} value={timelineNote}
              placeholder="Stima complessiva: ~8 settimane dall’avvio."
              onChange={(e) => setTimelineNote(e.target.value)} />
          </div>
          <PairListEditor label="Termini" aPlaceholder="Pagamento" bPlaceholder="40/30/30…"
            value={terms} onChange={setTerms} bMultiline />
          <PairListEditor label="Stack tecnico" aPlaceholder="Framework" bPlaceholder="Next.js 16"
            value={techStack} onChange={setTechStack} />
        </section>

        {error && (
          <p className="font-hanken text-sm text-[var(--coral)] m-0" role="alert">
            {error}
          </p>
        )}

        <button type="button" onClick={submit} disabled={pending || items.length === 0}
          className={cn(
            "self-start font-mono text-[15px] font-semibold px-6 py-[14px] rounded-[9px] transition-all duration-150",
            pending || items.length === 0
              ? "bg-raised text-muted cursor-not-allowed"
              : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
          )}>
          {pending ? "Creazione…" : "Crea bozza preventivo →"}
        </button>
      </div>

      {/* ── sidebar: catalogo + totale ── */}
      <aside className="flex flex-col gap-5 sticky top-24">
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-space text-[15px] font-semibold text-foreground m-0">
              Catalogo servizi
            </h2>
            <div className="flex gap-1">
              {(["web_assets", "enterprise"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTier(t)}
                  className={cn(
                    "font-mono text-[11px] px-[10px] py-[5px] rounded-full border cursor-pointer transition-all duration-150",
                    tier === t
                      ? "border-accent text-accent"
                      : "border-border text-muted hover:text-soft"
                  )}>
                  {t === "web_assets" ? "PMI" : "Enterprise"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {visibleCatalog.map((item) => (
              <button key={item.id} type="button" onClick={() => addFromCatalog(item)}
                className="text-left p-3 rounded-xl bg-raised border border-border cursor-pointer transition-all duration-150 hover:border-accent group">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-space text-[13.5px] font-semibold text-foreground group-hover:text-accent transition-colors">
                    {item.title}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted whitespace-nowrap">
                    {catalogPriceLabel(item)}
                  </span>
                </div>
                <span className="font-hanken text-[12.5px] leading-snug text-soft block mt-1">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-hanken text-sm text-soft">Netto voci</span>
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
          <p className="font-hanken text-xs text-muted mt-3 mb-0">
            IVA e totale finale calcolati sulla pagina pubblica in base alla
            selezione del cliente.
          </p>
        </div>
      </aside>
    </div>
  );
}
