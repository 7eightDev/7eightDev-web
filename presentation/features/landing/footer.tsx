import { useState, useEffect } from 'react';
import { cn } from '@/presentation/lib/utils';
import { LogoLockup } from '@/presentation/components/shared/logo';
import { Btn } from '@/presentation/components/shared/btn';
import { Container } from '@/presentation/components/shared/container';

export function Footer({ onQuote }: { onQuote: () => void }) {
  return (
    <footer className="border-t border-border bg-background py-[56px_0_40px] pt-8">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[32px]">
          <div>
            <LogoLockup size={17} />
            <p className="font-sans text-[14px] leading-[1.55] text-soft mt-[18px] max-w-[280px]">
              Sviluppo web su due livelli — siti per PMI e web app enterprise —
              con un solo standard di cura.
            </p>
          </div>
          {[
            [
              'Servizi',
              ['Siti PMI', 'Web app SaaS', 'Enterprise', 'Consulenza']
            ],
            ['Approccio', ['Metodo', 'Stack', 'Come lavoro']],
            [
              'Contatti',
              ['Preventivo', 'ciao@7eight.dev', 'LinkedIn', 'GitHub']
            ]
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="font-mono text-[12px] text-muted tracking-[0.1em] uppercase mb-[16px]">
                {h as string}
              </div>
              <div className="flex flex-col gap-[11px]">
                {(items as string[]).map((it) => (
                  <a
                    key={it}
                    href="#"
                    onClick={(e) => {
                      if (it === 'Preventivo') {
                        e.preventDefault();
                        onQuote();
                      }
                    }}
                    className="font-sans text-[14px] text-soft hover:text-accent no-underline transition-colors duration-150"
                  >
                    {it}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-[44px] pt-[24px] border-t border-border flex-wrap gap-[12px]">
          <span className="font-mono text-[12px] text-muted">
            © 2026 7eightDev · P.IVA 00000000000
          </span>
          <span className="font-mono text-[12px] text-muted">
            made with clean code, not magic
          </span>
        </div>
      </Container>
    </footer>
  );
}
