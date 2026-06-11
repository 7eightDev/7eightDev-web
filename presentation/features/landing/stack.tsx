import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { SectionHead } from "@/presentation/components/shared/section-head";

const STACK = [
  { g: 'Core', items: ['Next.js', 'TypeScript', 'React'] },
  { g: 'Frontend', items: ['Tailwind', 'Radix', 'Zustand / Query', 'Framer Motion'] },
  { g: 'Backend & dati', items: ['Node', 'PostgreSQL', 'Prisma', 'tRPC / REST'] },
  { g: 'Qualità & infra', items: ['Vitest', 'Playwright', 'GitHub Actions', 'Vercel'] },
];

export function Stack() {
  return (
    <section id="stack" className="py-[92px] border-t border-border">
      <Container>
        <SectionHead 
          eyebrow="Stack"
          title="Strumenti moderni, scelti per durare."
          sub="Niente mode passeggere: tecnologie mature, con community solide e un percorso di manutenzione chiaro." 
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[20px] mt-[46px]">
          {STACK.map((col, i) => (
            <Reveal key={col.g} delay={i * 70}>
              <div>
                <div className="font-mono text-[12.5px] text-accent tracking-[0.08em] uppercase pb-[14px] mb-[16px] border-b border-border">
                  {col.g}
                </div>
                <div className="flex flex-col gap-[10px]">
                  {col.items.map((it) => (
                    <div key={it} className="font-mono text-[14.5px] text-[#cdd3dc] flex items-center gap-[10px]">
                      <span className="w-[5px] h-[5px] rounded-[3px] bg-dim flex-none" />{it}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
