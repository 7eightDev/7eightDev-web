"use client";

import { LogoLockup } from '@/presentation/components/shared/logo';
import { Container } from '@/presentation/components/shared/container';
import { useQuoteModal } from './quote-context';

interface FooterLink {
  label: string;
  href: string;
  /** Opens the quote modal instead of navigating. */
  modal?: boolean;
  /** Opens in a new tab with rel="noreferrer". */
  external?: boolean;
}

const LINK_COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Servizi',
    links: [
      { label: 'Siti PMI', href: '#doppio' },
      { label: 'Web app SaaS', href: '#doppio' },
      { label: 'Enterprise', href: '#doppio' },
      { label: 'Consulenza', href: '#doppio' }
    ]
  },
  {
    heading: 'Approccio',
    links: [
      { label: 'Metodo', href: '#metodo' },
      { label: 'Stack', href: '#stack' },
      { label: 'Come lavoro', href: '#processo' }
    ]
  },
  {
    heading: 'Contatti',
    links: [
      { label: 'Preventivo', href: '#', modal: true },
      { label: 'info@7eightdev.com', href: 'mailto:info@7eightdev.com' },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/giuseppe-pesce-dev/',
        external: true
      },
      {
        label: 'GitHub',
        href: 'https://github.com/7eightDev',
        external: true
      }
    ]
  }
];

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
          {LINK_COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="font-mono text-[12px] text-muted tracking-widest uppercase mb-4">
                {col.heading}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      if (link.modal) {
                        e.preventDefault();
                        open();
                      }
                    }}
                    {...(link.external
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                    className="font-sans text-[14px] text-soft hover:text-accent no-underline transition-colors duration-150"
                  >
                    {link.label}
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
