import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { Chip } from "@/presentation/components/shared/chip";
import { SectionHead } from "@/presentation/components/shared/section-head";
import { TagLabel } from "@/presentation/components/shared/tag-label";
import { cn } from "@/presentation/lib/utils";

const TRACKS = [
  { 
    i: '01', 
    t: 'Siti per PMI & realtà locali', 
    d: 'Siti vetrina, landing e piccoli e-commerce per imprese che vogliono presenza online seria e veloce.',
    list: ['Siti vetrina e landing che convertono', 'Performance e Core Web Vitals al massimo', 'SEO tecnica e contenuti gestibili', 'Hosting moderno, costi prevedibili'],
    out: 'Un sito che lavora per te, non da rifare tra un anno.',
    hot: false 
  },
  { 
    i: '02', 
    t: 'Web app SaaS & Enterprise', 
    d: 'Piattaforme complesse, dashboard e prodotti SaaS dove architettura, scalabilità e qualità del codice contano davvero.',
    list: ['Dashboard, prodotti SaaS, design system', 'Architettura scalabile e manutenibile', 'Integrazioni, real-time, flussi complessi', 'Codice testato, documentato, pronto al team'],
    out: 'Software che cresce senza rompersi.', 
    hot: true 
  },
];

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-none mt-[3px]">
    <path d="M3 8.5l3 3 7-8" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function TrackCard({ tr }: { tr: typeof TRACKS[0] }) {
  return (
    <div className={cn("relative p-[34px] rounded-[16px] bg-surface border border-border h-full box-border", tr.hot && "border-accent/38 shadow-[0_0_60px_-34px_var(--accent)]")}>
      <div className="flex items-center justify-between mb-[18px]">
        <span className="font-mono text-[13px] text-muted tracking-[0.1em]">{tr.i}</span>
        {tr.hot && <Chip accent>alta complessità</Chip>}
      </div>
      <h3 className="font-space font-semibold text-[24px] tracking-[-0.02em] mb-[12px] text-foreground">{tr.t}</h3>
      <p className="font-sans text-[15.5px] leading-[1.55] text-soft mb-[22px]">{tr.d}</p>
      <ul className="list-none p-0 m-[0_0_24px] flex flex-col gap-[11px]">
        {tr.list.map((li) => (
          <li key={li} className="flex gap-[11px] font-sans text-[14.5px] leading-[1.45] text-[#cdd3dc]">
            <Check />
            {li}
          </li>
        ))}
      </ul>
      <div className="pt-[18px] border-t border-border font-mono text-[13px] text-accent flex items-center gap-[8px]">
        <span className="opacity-60">→</span>{tr.out}
      </div>
    </div>
  );
}

export function Dual() {
  return (
    <section id="doppio" className="py-16 md:py-23 border-t border-border">
      <Container>
        <SectionHead
          eyebrow={<TagLabel name="DoppioLivello" propKey="livelli" propValue={2} />}
          title="Un solo sviluppatore, due mondi: il tuo sito e la tua piattaforma."
          sub="La maggior parte sceglie tra ‘economico ma scadente’ e ‘bravo ma solo per grandi aziende’. Io copro entrambi i mondi, con lo stesso standard di cura." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] mt-[46px]">
          {TRACKS.map((tr, i) => (
            <Reveal key={tr.i} delay={i * 90}>
              <TrackCard tr={tr} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
