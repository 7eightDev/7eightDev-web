import { Container } from "@/presentation/components/shared/container";
import { Reveal } from "@/presentation/components/shared/reveal";
import { Btn } from "@/presentation/components/shared/btn";
import { Eyebrow } from "@/presentation/components/shared/eyebrow";
import { cn } from "@/presentation/lib/utils";

export function CtaBand({ onQuote }: { onQuote: () => void }) {
  return (
    <section className="py-[100px] border-t border-border relative overflow-hidden">
      <div className="absolute bottom-[-200px] left-[50%] -translate-x-[50%] w-[760px] h-[520px] bg-[radial-gradient(circle,_color-mix(in_oklab,_var(--accent)_14%,_transparent),_transparent_60%)] pointer-events-none" />
      <Container className="relative text-center max-w-[820px]">
        <Reveal><Eyebrow className="justify-center">Preventivi · /preventivi/[cliente]</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h2 className="font-space font-semibold text-[clamp(32px,4vw,52px)] tracking-[-0.03em] leading-[1.05] mt-[20px] text-foreground text-balance">
            Hai un progetto? Ti preparo un preventivo su misura.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="font-sans text-[18px] leading-[1.55] text-soft max-w-[560px] mx-auto mt-[20px]">
            Ogni cliente riceve una pagina dedicata con scope, tempi e costi trasparenti. Dimmi due righe sul progetto e ti rispondo entro 24 ore.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="flex gap-[12px] justify-center mt-[34px] flex-wrap">
            <Btn variant="primary" onClick={(e) => { e.preventDefault(); onQuote(); }}>Richiedi un preventivo <span className="opacity-70">→</span></Btn>
            <Btn variant="ghost" href="mailto:ciao@7eight.dev">ciao@7eight.dev</Btn>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
