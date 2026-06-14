'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/presentation/lib/utils';
import { Container } from '@/presentation/components/shared/container';
import { LogoLockup } from '@/presentation/components/shared/logo';
import { Btn } from '@/presentation/components/shared/btn';
import { useQuoteModal } from './quote-context';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import { User, LayoutDashboard } from 'lucide-react';

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
          ? 'bg-[rgba(10,11,13,0.82)] border-b border-border'
          : 'bg-[rgba(10,11,13,0.4)] border-b border-transparent'
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
              <SignInButton mode="modal">
                <button className="flex items-center justify-center p-2 text-soft hover:text-foreground transition-colors border-none bg-transparent cursor-pointer">
                  <User size={20} />
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8'
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Area Admin"
                    labelIcon={<LayoutDashboard size={16} />}
                    href="/admin/quotes"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </Show>
          </div>
        </div>
      </div>
    </header>
  );
}
