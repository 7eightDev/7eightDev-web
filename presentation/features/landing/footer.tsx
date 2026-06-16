"use client";

import { LogoLockup } from '@/presentation/components/shared/logo';
import { Container } from '@/presentation/components/shared/container';
import { useQuoteModal } from './quote-context';

export function Footer() {
  const { open } = useQuoteModal();
  return (
    <footer className="border-t border-border bg-background py-8">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <LogoLockup size={17} />
            <p className="font-sans text-[14px] leading-[1.55] text-soft mt-5 max-w-70">
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
              ['Preventivo', 'info@7eightdev.com', 'LinkedIn', 'GitHub']
            ]
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="font-mono text-[12px] text-muted tracking-widest uppercase mb-4">
                {h as string}
              </div>
              <div className="flex flex-col gap-3">
                {(items as string[]).map((it) => (
                  <a
                    key={it}
                    href="#"
                    onClick={(e) => {
                      if (it === 'Preventivo') {
                        e.preventDefault();
                        open();
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
        <div className="flex justify-between items-center mt-11 pt-6 border-t border-border flex-wrap gap-3">
          <span className="font-mono text-[12px] text-muted">
            © 2026 7eightDev · C.F. PSCGPP78H04D662A
          </span>
          <span className="font-mono text-[12px] text-muted">
            made with clean code, not magic
          </span>
        </div>
      </Container>
    </footer>
  );
}
