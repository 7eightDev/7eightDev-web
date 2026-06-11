"use client";

import { useState, useEffect } from "react";
import { cn } from "@/presentation/lib/utils";
import { Container } from "@/presentation/components/shared/container";
import { Btn } from "@/presentation/components/shared/btn";

const TYPES = ['Sito PMI', 'Web app / SaaS', 'Non sono sicuro'];
const BUDGETS = ['< 5.000 €', '5.000 – 15.000 €', '15.000 – 50.000 €', '> 50.000 €', 'Da definire'];
const slugify = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'cliente';

function Field({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[12px] text-soft tracking-[0.04em] mb-[8px]">{label}</span>
      {children}
      {error && <span className="block font-mono text-[11.5px] text-coral mt-[6px]">{error}</span>}
    </label>
  );
}

const inputClass = (err?: string) => cn(
  "w-full bg-background text-foreground border rounded-[9px] p-[12px_14px] font-sans text-[15px] outline-none transition-colors duration-150",
  err ? "border-coral" : "border-border"
);

export function QuoteModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [f, setF] = useState({ nome: '', email: '', tipo: '', budget: BUDGETS[1], msg: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (open) { setDone(false); setErr({}); }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.nome.trim()) e.nome = 'Inserisci nome o azienda';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'Email non valida';
    if (!f.tipo) e.tipo = 'Seleziona un tipo';
    if (f.msg.trim().length < 12) e.msg = 'Raccontami qualche dettaglio in più';
    setErr(e); return Object.keys(e).length === 0;
  };
  const submit = (ev: React.FormEvent) => { ev.preventDefault(); if (validate()) setDone(true); };

  return (
    <div onClick={onClose} className="fixed inset-0 z-100 bg-[rgba(6,7,9,0.72)] backdrop-blur-[6px] flex items-start justify-center p-[6vh_20px] overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] bg-surface border border-border rounded-[16px] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] overflow-hidden animate-pop-in">
        <div className="flex items-center justify-between p-[16px_20px] border-b border-border bg-background">
          <span className="font-mono text-[13px] text-accent">// nuovo-preventivo</span>
          <button onClick={onClose} aria-label="Chiudi" className="bg-transparent border-none text-soft text-[22px] cursor-pointer leading-none w-[30px] h-[30px] rounded-[8px] hover:bg-surface">×</button>
        </div>

        {!done ? (
          <form onSubmit={submit} className="p-[26px] flex flex-col gap-[18px]">
            <div className="grid grid-cols-2 gap-[16px]">
              <Field label="Nome / azienda" error={err.nome}>
                <input className={inputClass(err.nome)} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Osteria Bella" />
              </Field>
              <Field label="Email" error={err.email}>
                <input className={inputClass(err.email)} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@azienda.it" />
              </Field>
            </div>
            <Field label="Tipo di progetto" error={err.tipo}>
              <div className="flex gap-[8px] flex-wrap">
                {TYPES.map((t) => (
                  <button type="button" key={t} onClick={() => set('tipo', t)} className={cn(
                    "font-mono text-[12.5px] p-[9px_13px] rounded-[8px] cursor-pointer border transition-all duration-150",
                    f.tipo === t ? "border-accent bg-accent/14 text-accent" : "border-border bg-background text-soft"
                  )}>{t}</button>
                ))}
              </div>
            </Field>
            <Field label="Budget indicativo">
              <select className={cn(inputClass(), "font-mono text-[13.5px]")} value={f.budget} onChange={(e) => set('budget', e.target.value)}>
                {BUDGETS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Il progetto in breve" error={err.msg}>
              <textarea rows={3} className={cn(inputClass(err.msg), "resize-vertical min-h-[76px]")} value={f.msg} onChange={(e) => set('msg', e.target.value)} placeholder="Cosa vuoi costruire, per chi, con quali tempi…" />
            </Field>
            <Btn variant="primary" onClick={submit} className="justify-center p-[14px]">Invia richiesta →</Btn>
          </form>
        ) : (
          <div className="p-[34px]">
            <div className="w-[46px] h-[46px] rounded-[24px] bg-accent/18 border border-accent flex items-center justify-center mb-[20px]">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="font-space font-semibold text-[24px] tracking-[-0.02em] mb-[10px] text-foreground">Richiesta ricevuta.</h3>
            <p className="font-sans text-[15.5px] leading-[1.55] text-soft mb-[22px]">
              Grazie {f.nome.trim().split(' ')[0]}. Preparo un preventivo dedicato e te lo trovi qui, entro 24 ore:
            </p>
            <div className="bg-background border border-border rounded-[10px] p-[14px_16px] font-mono text-[13.5px] text-foreground flex items-center gap-[8px] flex-wrap">
              <span className="text-muted">7eight.dev/preventivi/</span>
              <span className="text-accent">{slugify(f.nome)}</span>
              <span className="inline-block w-[7px] h-[14px] bg-accent animate-blink" />
            </div>
            <div className="mt-[24px]">
              <Btn variant="ghost" onClick={(e) => { e.preventDefault(); onClose(); }} className="justify-center w-full">Chiudi</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
