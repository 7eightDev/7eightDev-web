import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { SectionHead } from "@/presentation/components/shared/section-head";
import { cn } from "@/presentation/lib/utils";

const STEPS = [
  { n: '01', t: 'Discovery & obiettivi', d: 'Capisco business, utenti, vincoli e budget. Niente preventivi al buio.' },
  { n: '02', t: 'Architettura & preventivo', d: 'Proposta tecnica e preventivo dettagliato su una pagina dedicata: /preventivi/[tu].' },
  { n: '03', t: 'Sviluppo guidato dai test', d: 'Sprint brevi, demo frequenti, codice testato a ogni passo. Vedi avanzare il lavoro.' },
  { n: '04', t: 'Consegna & handoff', d: 'Deploy, documentazione e formazione. Il codice resta tuo, leggibile e manutenibile.' },
];

export function Processo() {
  return (
    <section id="processo" className="py-16 md:py-23 bg-surface border-t border-border">
      <Container>
        <div className="max-w-[720px]">
          <Reveal>
            <span className="font-mono text-[12px] text-accent tracking-[0.1em] uppercase block mb-[10px]">Come lavoro</span>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="font-space font-semibold text-[clamp(28px,3.4vw,42px)] tracking-[-0.03em] leading-[1.06] mt-[18px] text-foreground text-balance">
              Un processo trasparente, dal primo contatto al deploy.
            </h2>
          </Reveal>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[20px] mt-[50px]">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="relative pt-[26px]">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-border" />
                <div className={cn("absolute top-[-5px] left-0 w-[10px] h-[10px] rounded-[6px]", i === 1 ? "bg-accent" : "bg-dim")} />
                <div className="font-mono text-[12.5px] text-muted tracking-[0.1em] mb-[12px]">{s.n}</div>
                <h3 className="font-space font-semibold text-[18.5px] tracking-[-0.01em] mb-[10px] text-foreground">{s.t}</h3>
                <p className="font-sans text-[14.5px] leading-[1.55] text-soft">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
