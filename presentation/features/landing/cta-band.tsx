"use client";

import { Container } from '@/presentation/components/shared/container';
import { Reveal } from '@/presentation/components/shared/reveal';
import { Btn } from '@/presentation/components/shared/btn';
import { Eyebrow } from '@/presentation/components/shared/eyebrow';
import { cn } from '@/presentation/lib/utils';
import { useQuoteModal } from './quote-context';

export function CtaBand() {
  const { open } = useQuoteModal();
  return (
    <section className="py-25 border-t border-border relative overflow-hidden">
      <div className="absolute -bottom-50 left-[50%] translate-x-[-50%] w-190 h-130 bg-[radial-gradient(circle,_color-mix(in_oklab,_var(--accent)_14%,_transparent),_transparent_60%)] pointer-events-none" />
      <Container className="relative text-center max-w-205">
        <Reveal>
          <Eyebrow className="justify-center">
            Preventivi · /preventivi/[cliente]
          </Eyebrow>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="font-space font-semibold text-[clamp(32px,4vw,52px)] tracking-[-0.03em] leading-[1.05] mt-5 text-foreground text-balance">
            Hai un progetto? Ti preparo un preventivo su misura.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="font-sans text-[18px] leading-[1.55] text-soft max-w-140 mx-auto mt-5">
            Ogni cliente riceve una pagina dedicata con scope, tempi e costi
            trasparenti. Dimmi due righe sul progetto e ti rispondo entro 24
            ore.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <Btn
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                open();
              }}
            >
              Richiedi un preventivo <span className="opacity-70">→</span>
            </Btn>
            <Btn variant="ghost" href="mailto:info@7eightdev.com">
              info@7eightdev.com
            </Btn>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
