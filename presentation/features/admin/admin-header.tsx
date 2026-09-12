"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ExternalLink, Menu, X } from "lucide-react";
import { cn } from "@/presentation/lib/utils";
import { Button } from "@/presentation/components/ui/button";
import { Container } from "@/presentation/components/shared/container";
import { LogoLockup } from "@/presentation/components/shared/logo";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";
import { GoogleQuotaBadge } from "@/presentation/features/admin/google-quota-badge";

interface NavItem {
  href: string;
  label: string;
}

interface AdminHeaderProps {
  /** Controls visibility of the dev-only "Email" link (NODE_ENV check on the server). */
  showEmailLink?: boolean;
}

export function AdminHeader({ showEmailLink = false }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/admin/quotes", label: "Preventivi" },
    { href: "/admin/catalog", label: "Catalogo" },
    { href: "/admin/leads", label: "Lead" },
    ...(showEmailLink
      ? [
          { href: "/admin/email", label: "Email" },
          { href: "/admin/leads/report", label: "Report Lead" },
        ]
      : []),
  ];

  // Lock body scroll + close on Escape while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-[14px] border-b border-border">
      <Container className="max-w-none h-14 flex items-center justify-between gap-4">
        {/* Left: logo + desktop nav */}
        <div className="flex items-stretch gap-6 min-w-0">
          <Link href="/admin/quotes" className="shrink-0 self-center">
            <LogoLockup size={15} />
          </Link>

          <nav className="hidden md:flex items-stretch gap-6 self-stretch">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center font-sans text-[13.5px] transition-colors duration-150 no-underline",
                    active
                      ? "font-semibold text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-accent"
                      : "text-soft hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: quota badge + theme + site link · divider · avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <GoogleQuotaBadge />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden md:inline-flex rounded-[8px] text-soft hover:bg-raised hover:text-foreground cursor-pointer"
          >
            <Link href="/" aria-label="Vai al sito pubblico" title="Vai al sito">
              <span>Vai al sito</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <span className="hidden md:block h-4 w-[1px] bg-border mx-1" aria-hidden />
          <div className="hidden md:block">
            <UserButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Apri il menu"
            aria-expanded={open}
            className="md:hidden flex items-center justify-center size-9 -mr-1 rounded-[9px] text-soft hover:text-foreground hover:bg-raised transition-colors duration-150 border-none bg-transparent cursor-pointer"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </Container>

      {/* Full-height mobile overlay menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 h-[100dvh] bg-background animate-fade-up">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
              <LogoLockup size={15} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Chiudi il menu"
                className="flex items-center justify-center size-9 -mr-1 rounded-[9px] text-soft hover:text-foreground hover:bg-raised transition-colors duration-150 border-none bg-transparent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col flex-1 px-6 py-4 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "font-sans text-[19px] py-4 border-b border-border/60 no-underline transition-colors duration-150",
                    isActive(item.href)
                      ? "font-semibold text-accent"
                      : "text-soft hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between font-sans text-[19px] py-4 border-b border-border/60 text-soft hover:text-foreground no-underline transition-colors duration-150"
              >
                <span>Vai al sito</span>
                <ExternalLink className="size-[19px]" />
              </Link>
            </nav>

            <div className="px-6 py-5 border-t border-border shrink-0">
              <div className="flex items-center gap-3 font-sans text-[15px] text-soft">
                <UserButton />
                <span>Profilo</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
