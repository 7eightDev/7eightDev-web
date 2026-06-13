"use client";

import { useState } from "react";
import { cn } from "@/presentation/lib/utils";
import { Container } from "@/presentation/components/shared/container";
import { Eyebrow } from "@/presentation/components/shared/eyebrow";
import { Reveal } from "@/presentation/components/shared/reveal";
import { Btn } from "@/presentation/components/shared/btn";
import { Chip } from "@/presentation/components/shared/chip";
import { useQuoteModal } from "./quote-context";

const C = { mut: 'var(--muted)', soft: 'var(--text-soft)', txt: 'var(--text)', acc: 'var(--accent)', dim: 'var(--dim)' };
const MODES = {
  pmi: {
    file: '~/clienti/osteria-bella',
    lines: [
      { t: '▸ next build --prod', c: C.txt },
      { t: '', c: C.mut },
      { t: '○  /            prerendered', c: C.soft },
      { t: '○  /menu        prerendered', c: C.soft },
      { t: '○  /prenota     prerendered', c: C.soft },
      { t: '', c: C.mut },
      { t: '✓  Lighthouse  100 · 100 · 100', c: C.acc },
      { t: '✓  build pronta in 4.2s', c: C.acc },
    ],
  },
  ent: {
    file: 'src/domain/quote/CreateQuote.ts',
    lines: [
      { t: 'application/ · domain/ · infrastructure/', c: C.mut },
      { t: '', c: C.mut },
      { t: 'export class CreateQuote {', c: C.soft },
      { t: '  constructor(private repo: QuoteRepo) {}', c: C.dim },
      { t: '}', c: C.soft },
      { t: '', c: C.mut },
      { t: '▸ pnpm test', c: C.txt },
      { t: '✓  124 passed · coverage 98%', c: C.acc },
    ],
  },
};

function Terminal({ mode }: { mode: 'pmi' | 'ent' }) {
  const data = MODES[mode];
  return (
    <div className="rounded-[14px] border border-border bg-[#0c0e12] overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 p-[13px_16px] border-b border-border bg-surface">
        <span className="w-[11px] h-[11px] rounded-[6px] bg-[#2c313b]" />
        <span className="w-[11px] h-[11px] rounded-[6px] bg-[#2c313b]" />
        <span className="w-[11px] h-[11px] rounded-[6px] bg-[#2c313b]" />
        <span className="ml-2.5 font-mono text-[12.5px] text-muted">{data.file}</span>
        <span className="ml-auto font-mono text-[11px] text-accent flex items-center gap-[6px]">
          <span className="w-[7px] h-[7px] rounded-[4px] bg-accent" />zsh
        </span>
      </div>
      <div key={mode} className="p-[20px_20px_24px] font-mono text-[13.5px] leading-[1.85] min-h-[250px]">
        {data.lines.map((ln, i) => (
          <div key={i} className="animate-line-in" style={{ color: ln.c, whiteSpace: 'pre', animationDelay: `${i * 75}ms` }}>
            {ln.t || '\u00A0'}
          </div>
        ))}
        <span className="inline-block w-[8px] h-[16px] bg-accent align-middle animate-blink" />
      </div>
    </div>
  );
}

const HERO = {
  pmi: {
    tag: 'Per PMI',
    h: ['Un sito web veloce', 'e curato', ', costruito come si deve.'],
    sub: 'Per piccole e medie imprese che vogliono un partner affidabile: un sito performante, manutenibile e pensato per durare — non un template gonfio.',
    points: ['Performance reali', 'SEO tecnica', 'Manutenibile'],
  },
  ent: {
    tag: 'Per Enterprise & SaaS',
    h: ['Web app che reggono', ' la crescita', ', architettate sul serio.'],
    sub: 'Per startup SaaS e aziende enterprise: Clean Architecture, Domain-Driven Design e Test-Driven Development applicati dal frontend in su. Scalabilità e qualità del codice come default.',
    points: ['Clean Architecture', 'DDD', 'TDD'],
  },
};

export function Hero() {
  const { open } = useQuoteModal();
  const [mode, setMode] = useState<'pmi' | 'ent'>('ent');
  const d = HERO[mode];
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute top-[-180px] right-[-120px] w-[620px] h-[620px] bg-[radial-gradient(circle,_color-mix(in_oklab,_var(--accent)_16%,_transparent),_transparent_62%)] pointer-events-none blur-[8px]" />
      <Container className="relative p-[64px_32px_92px]">
        <Reveal>
          <Eyebrow>agenzia di sviluppo · Next.js / TypeScript / React</Eyebrow>
        </Reveal>

        <Reveal delay={60}>
          <p className="font-sans text-[15.5px] text-soft mt-[26px] mb-[28px] max-w-[560px] leading-[1.5]">
            Due livelli, un solo standard di cura — dal sito della tua impresa
            alla piattaforma SaaS ad alta complessità.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="inline-flex p-[4px] rounded-[11px] bg-surface border border-border gap-[4px] mb-[48px]">
            {Object.keys(HERO).map((k) => (
              <button key={k} onClick={() => setMode(k as 'pmi' | 'ent')} className={cn(
                "font-mono text-[13px] font-semibold cursor-pointer p-[9px_16px] rounded-[8px] border-none transition-all duration-200",
                mode === k ? "bg-accent text-[#0a0b0d]" : "bg-transparent text-soft"
              )}>
                {HERO[k as 'pmi' | 'ent'].tag}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-[56px] items-center hero-grid">
          <div>
            <h1 key={mode} className="font-space font-semibold text-[clamp(38px,4.6vw,62px)] leading-[1.02] tracking-[-0.03em] m-0 text-foreground animate-slide-up">
              {d.h[0]}<span className="text-accent">{d.h[1]}</span>{d.h[2]}
            </h1>
            <p key={mode + 's'} className="font-sans text-[18px] leading-[1.58] text-soft max-w-[520px] mt-[22px] animate-slide-up" style={{ animationDelay: '100ms' }}>{d.sub}</p>

            <div className="flex gap-[12px] mt-[32px] flex-wrap">
              <Btn variant="primary" onClick={(e) => { e.preventDefault(); open(); }}>
                Richiedi un preventivo <span className="opacity-70">→</span>
              </Btn>
              <Btn variant="ghost" href="#metodo">Vedi come lavoro</Btn>
            </div>

            <div key={mode + 'p'} className="flex gap-[9px] mt-[30px] flex-wrap animate-slide-up" style={{ animationDelay: '200ms' }}>
              {d.points.map((p) => <Chip key={p} accent>{p}</Chip>)}
            </div>
          </div>

          <Reveal delay={160} className="md:block hidden">
            <Terminal mode={mode} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
