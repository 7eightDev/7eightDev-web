'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/presentation/lib/utils';
import { LogoLockup } from '@/presentation/components/shared/logo';
import { Btn } from '@/presentation/components/shared/btn';
import { ThemeToggle } from '@/presentation/components/shared/theme-toggle';
import { useQuoteModal } from './quote-context';
import { Show } from '@clerk/nextjs';
import { LayoutDashboard } from 'lucide-react';
import { UserMenu } from '@/presentation/features/shared/user-menu';
import { SignInDialog } from '@/presentation/features/shared/sign-in-dialog';

const NAV_LINKS = [
  ['#doppio', 'Doppio livello'],
  ['#metodo', 'Metodo'],
  ['#stack', 'Stack'],
  ['#processo', 'Come lavoro']
];

export function Nav() {
  const { open } = useQuoteModal();
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
          ? 'bg-background/80 border-b border-border'
          : 'bg-background/40 border-b border-transparent'
      )}
    >
      <div className="w-full px-8 h-17 flex items-center justify-between gap-4">
        <a href="#top" className="no-underline flex-none">
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
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Btn
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              open();
            }}
            className="px-4 py-2.5"
          >
            <span className="md:hidden">Preventivo</span>
            <span className="hidden md:inline">Richiedi un preventivo</span>
          </Btn>

          <div className="flex items-center">
            <Show when="signed-out">
              <SignInDialog />
            </Show>
            <Show when="signed-in">
              <UserMenu
                links={[
                  {
                    href: '/admin/quotes',
                    label: 'Area Admin',
                    icon: <LayoutDashboard size={16} />
                  }
                ]}
              />
            </Show>
          </div>
        </div>
      </div>
    </header>
  );
}
