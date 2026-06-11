import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { Chip } from "@/presentation/components/shared/chip";
import { SectionHead } from "@/presentation/components/shared/section-head";
import { cn } from "@/presentation/lib/utils";

function CleanArchDiagram() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
      <circle cx="64" cy="64" r="58" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="44" fill="none" stroke="var(--dim)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="30" fill="none" stroke="var(--muted)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="16" fill="color-mix(in oklab, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="64" y="64" textAnchor="middle" dominantBaseline="central" fill="var(--accent)"
        className="font-mono font-bold text-[9px]">Domain</text>
      <path d="M96 32l-10 4 4-10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 38C80 48 74 52 70 56" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  );
}

function DDDDiagram() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
      <rect x="14" y="30" width="46" height="40" rx="7" stroke="var(--muted)" strokeWidth="1.5" />
      <rect x="70" y="58" width="46" height="40" rx="7" stroke="var(--accent)" strokeWidth="1.5"
        fill="color-mix(in oklab, var(--accent) 10%, transparent)" />
      <text x="37" y="50" textAnchor="middle" fill="var(--muted)" className="font-mono text-[8px]">Billing</text>
      <text x="93" y="78" textAnchor="middle" fill="var(--accent)" className="font-mono text-[8px]">Quotes</text>
      <path d="M58 56l16 8" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}

function TDDDiagram() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none">
      <path d="M52 40a26 26 0 1 1 -4 30" stroke="var(--dim)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M50 70l-4 6 7-1" stroke="var(--dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="44" r="9" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="88" cy="44" r="9" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="64" cy="88" r="9" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="64" y="64" textAnchor="middle" dominantBaseline="central" fill="var(--muted)" className="font-mono text-[8px]">R→G→R</text>
    </svg>
  );
}

const PILLARS = [
  { dia: CleanArchDiagram, t: 'Clean Architecture', d: 'Logica separata in layer con dipendenze rivolte verso l’interno. Il dominio non sa nulla del framework: cambiare DB o UI non tocca le regole di business.' },
  { dia: DDDDiagram, t: 'Domain-Driven Design', d: 'Il dominio al centro, anche nel frontend. Bounded context chiari e un linguaggio condiviso con te: il codice parla la lingua del tuo business.' },
  { dia: TDDDiagram, t: 'Test-Driven Development', d: 'I test guidano il codice, non lo seguono. Ogni funzionalità nasce con la sua rete di sicurezza: meno regressioni, refactor senza paura.' },
];
const GUARANTEES = ['copertura test', 'code review', 'architettura documentata', 'handoff completo', 'CI/CD', 'TypeScript strict'];

export function Metodo() {
  return (
    <section id="metodo" className="py-[92px] bg-surface border-t border-border">
      <Container>
        <SectionHead 
          eyebrow="Metodo · al posto del portfolio"
          title="Niente case study (ancora). In compenso, un metodo che è una garanzia."
          sub="Un portfolio mostra cosa ho fatto. Il metodo mostra come lavoro su ogni progetto — ed è ciò che protegge il tuo investimento nel tempo." 
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] mt-[50px]">
          {PILLARS.map((p, i) => {
            const Dia = p.dia;
            return (
              <Reveal key={p.t} delay={i * 90}>
                <div className="p-[30px] rounded-[16px] bg-background border border-border h-full">
                  <div className="flex justify-center mb-[18px]"><Dia /></div>
                  <div className="font-mono text-[12px] text-muted tracking-[0.1em] mb-[6px]">0{i + 1}</div>
                  <h3 className="font-mono font-bold text-[19px] tracking-[-0.01em] mb-[12px] text-foreground">{p.t}</h3>
                  <p className="font-sans text-[14.5px] leading-[1.55] text-soft">{p.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={120}>
          <div className="flex flex-wrap gap-[10px] mt-[34px] items-center">
            <span className="font-mono text-[13px] text-muted mr-[4px]">incluso sempre →</span>
            {GUARANTEES.map((g) => <Chip key={g}>{g}</Chip>)}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
