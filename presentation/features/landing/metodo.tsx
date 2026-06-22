import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { SectionHead } from "@/presentation/components/shared/section-head";
import { TagLabel } from "@/presentation/components/shared/tag-label";
import { CleanArchDiagram, DDDDiagram, TDDDiagram } from "@/presentation/features/landing/method-diagrams";

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-none mt-[3px]">
      <path d="M3 8.5l3 3 7-8" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    <section id="metodo" className="py-16 md:py-23 bg-surface border-t border-border">
      <Container>
        <SectionHead
          eyebrow={<TagLabel name="Metodo" propKey="garanzie" propValue={6} />}
          title="La qualità non è fortuna. È metodo."
          sub="Un portfolio mostra cosa ho fatto. Il metodo mostra come lavoro su ogni progetto — ed è ciò che protegge il tuo investimento nel tempo." 
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] mt-[50px]">
          {PILLARS.map((p, i) => {
            const Dia = p.dia;
            return (
              <Reveal key={p.t} delay={i * 90}>
                <div className="p-[30px] rounded-[16px] bg-background border border-border h-full transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_50px_-30px_var(--accent)]">
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
          <div className="mt-8.5">
            <div className="font-mono text-[12px] text-accent tracking-[0.12em] uppercase mb-4.5">
              Incluso sempre
            </div>
            <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3.5">
              {GUARANTEES.map((g) => (
                <li key={g} className="flex gap-[11px] items-start font-sans text-[14.5px] leading-[1.45] text-[#cdd3dc]">
                  <Check />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
