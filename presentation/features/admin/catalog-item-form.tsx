"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogItemAction,
  updateCatalogItemAction,
} from "@/application/catalog/catalog.actions";
import type {
  CatalogTier,
  ServiceCatalogItem,
} from "@/domain/catalog/catalog.types";
import { cn } from "@/presentation/lib/utils";

type PricingKind = "fixed" | "range" | "on_request";
type BillingKind = "one_time" | "recurring";
type Interval = "monthly" | "yearly";

interface CatalogItemFormProps {
  /** When provided, the form edits this item (id immutable); else it creates. */
  item?: ServiceCatalogItem;
}

const inputClass =
  "px-3 py-[10px] rounded-lg bg-raised border border-border text-foreground font-hanken text-sm outline-none transition-colors focus:border-accent placeholder:text-dim w-full";
const labelClass =
  "font-mono text-[11px] tracking-[0.1em] uppercase text-muted mb-[6px] block";
const pill = (active: boolean) =>
  cn(
    "font-mono text-[11px] px-3 py-2 rounded-lg border cursor-pointer transition-all",
    active ? "border-accent text-accent" : "border-border text-muted hover:text-soft"
  );

function priceUnits(money: { amountCents: number }): number {
  return money.amountCents / 100;
}

export function CatalogItemForm({ item }: CatalogItemFormProps) {
  const isEdit = !!item;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState(item?.id ?? "");
  const [tier, setTier] = useState<CatalogTier>(item?.tier ?? "web_assets");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");

  const [pricingKind, setPricingKind] = useState<PricingKind>(
    item?.pricing.kind ?? "fixed"
  );
  const [priceVal, setPriceVal] = useState<number>(
    item?.pricing.kind === "fixed" ? priceUnits(item.pricing.price) : 0
  );
  const [fromVal, setFromVal] = useState<number>(
    item?.pricing.kind === "range" ? priceUnits(item.pricing.from) : 0
  );
  const [toVal, setToVal] = useState<number>(
    item?.pricing.kind === "range" ? priceUnits(item.pricing.to) : 0
  );

  const [billingKind, setBillingKind] = useState<BillingKind>(
    item?.billing.kind ?? "one_time"
  );
  const [interval, setInterval] = useState<Interval>(
    item?.billing.kind === "recurring" ? item.billing.interval : "monthly"
  );

  const [defaultOptional, setDefaultOptional] = useState<boolean>(
    item?.defaultOptional ?? true
  );

  const buildPayload = () => ({
    tier,
    title,
    description,
    pricing:
      pricingKind === "fixed"
        ? { kind: "fixed" as const, priceUnits: priceVal }
        : pricingKind === "range"
          ? { kind: "range" as const, fromUnits: fromVal, toUnits: toVal }
          : { kind: "on_request" as const },
    billing:
      billingKind === "recurring"
        ? { kind: "recurring" as const, interval }
        : { kind: "one_time" as const },
    defaultOptional,
  });

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = buildPayload();
      const result = isEdit
        ? await updateCatalogItemAction(item.id, payload)
        : await createCatalogItemAction(id, payload);
      // On success the action redirects; we only land here on failure.
      if (result && !result.ok) setError(result.error ?? "Errore.");
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[680px]">
      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Id (slug) *</label>
            <input
              className={cn(inputClass, isEdit && "opacity-60 cursor-not-allowed")}
              value={id}
              placeholder="es. landing-page"
              disabled={isEdit}
              onChange={(e) => setId(e.target.value)}
            />
            {isEdit && (
              <p className="font-mono text-[10.5px] text-muted mt-1">
                L&apos;id è immutabile: è il riferimento usato dai preventivi.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Livello (tier) *</label>
            <div className="flex gap-2">
              {(["web_assets", "enterprise"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={pill(tier === t)}
                >
                  {t === "web_assets" ? "Web Assets (PMI)" : "Enterprise"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Titolo *</label>
          <input
            className={inputClass}
            value={title}
            placeholder="Landing Page (alta conversione)"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Descrizione *</label>
          <textarea
            className={`${inputClass} resize-y text-[13px]`}
            rows={3}
            value={description}
            placeholder="Cosa include il servizio, in parole per il cliente."
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </section>

      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <h2 className="font-space text-lg font-semibold text-foreground m-0">
          Prezzo
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["fixed", "range", "on_request"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPricingKind(k)}
              className={pill(pricingKind === k)}
            >
              {k === "fixed" ? "Fisso" : k === "range" ? "Range" : "Su richiesta"}
            </button>
          ))}
        </div>

        {pricingKind === "fixed" && (
          <div className="max-w-[220px]">
            <label className={labelClass}>Prezzo (€) *</label>
            <input
              className={inputClass}
              type="number"
              min={0}
              value={priceVal}
              onChange={(e) => setPriceVal(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        )}

        {pricingKind === "range" && (
          <div className="grid grid-cols-2 gap-4 max-w-[460px]">
            <div>
              <label className={labelClass}>Da (€) *</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={fromVal}
                onChange={(e) => setFromVal(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className={labelClass}>A (€) *</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={toVal}
                onChange={(e) => setToVal(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
        )}

        {pricingKind === "on_request" && (
          <p className="font-hanken text-sm text-muted m-0 italic">
            Nessun importo: il prezzo verrà definito su richiesta.
          </p>
        )}
      </section>

      <section className="p-4 sm:p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <h2 className="font-space text-lg font-semibold text-foreground m-0">
          Fatturazione
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["one_time", "recurring"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBillingKind(k)}
              className={pill(billingKind === k)}
            >
              {k === "one_time" ? "Una tantum" : "Ricorrente"}
            </button>
          ))}
          {billingKind === "recurring" &&
            (["monthly", "yearly"] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => setInterval(iv)}
                className={pill(interval === iv)}
              >
                {iv === "monthly" ? "/mese" : "/anno"}
              </button>
            ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-hanken text-[13px] text-soft w-fit">
          <input
            type="checkbox"
            checked={defaultOptional}
            className="w-4 h-4 accent-accent"
            onChange={(e) => setDefaultOptional(e.target.checked)}
          />
          Opzionale per default quando aggiunto a un preventivo
        </label>
      </section>

      {error && (
        <p className="font-hanken text-sm text-[var(--coral)] m-0" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={() => router.push("/admin/catalog")}
          className="font-mono text-xs font-semibold px-4 py-3 rounded-lg border border-border text-muted hover:text-soft transition-all"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={cn(
            "font-mono text-[15px] font-semibold px-6 py-[14px] rounded-[9px] transition-all duration-150",
            pending
              ? "bg-raised text-muted cursor-not-allowed"
              : "bg-accent text-[#0a0b0d] cursor-pointer hover:brightness-105 hover:-translate-y-px active:scale-[0.98]"
          )}
        >
          {pending
            ? "Salvataggio…"
            : isEdit
              ? "Salva modifiche →"
              : "Crea voce →"}
        </button>
      </div>
    </div>
  );
}
