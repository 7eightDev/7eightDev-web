import { useState, useEffect } from 'react';
import { cn } from '@/presentation/lib/utils';
import { Container } from '@/presentation/components/shared/container';
import { LogoLockup } from '@/presentation/components/shared/logo';
import { Btn } from '@/presentation/components/shared/btn';

const NAV_LINKS = [
  ['#doppio', 'Doppio livello'],
  ['#metodo', 'Metodo'],
  ['#stack', 'Stack'],
  ['#processo', 'Come lavoro']
];

export function Nav({ onQuote }: { onQuote: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', h, { passive: true });
    h();
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 backdrop-blur-[14px] transition-all duration-250 ease',
        scrolled
          ? 'bg-[rgba(10,11,13,0.82)] border-b border-border'
          : 'bg-[rgba(10,11,13,0.4)] border-b border-transparent'
      )}
    >
      <Container className="h-17 flex items-center justify-between">
        <a href="#top" className="no-underline">
          <LogoLockup size={17} />
        </a>
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[13.5px] text-soft hover:text-foreground no-underline transition-colors duration-150"
            >
              {label}
            </a>
          ))}
        </nav>
        <Btn
          variant="primary"
          onClick={(e) => {
            e.preventDefault();
            onQuote();
          }}
          className="px-4 py-2.5"
        >
          <span className="md:hidden">Preventivo</span>
          <span className="hidden md:inline">Richiedi un preventivo</span>
        </Btn>
      </Container>
    </header>
  );
}
