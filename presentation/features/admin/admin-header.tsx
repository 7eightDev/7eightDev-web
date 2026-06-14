"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/presentation/lib/utils";
import { Container } from "@/presentation/components/shared/container";
import { LogoLockup } from "@/presentation/components/shared/logo";

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
    ...(showEmailLink ? [{ href: "/admin/email", label: "Email" }] : []),
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
    <header className="sticky top-0 z-40 bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] border-b border-border">
      <Container className="max-w-[1100px] h-16 flex items-center justify-between gap-4">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/admin/quotes" className="shrink-0">
            <LogoLockup size={15} />
          </Link>
          <span className="w-px h-[22px] bg-border hidden md:block" />
          <nav className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[13px] text-soft hover:text-foreground transition-colors duration-150 no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: desktop home + user, mobile user + hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            aria-label="Vai al sito pubblico"
            title="Vai al sito"
            className="hidden md:inline-flex items-center gap-1.5 font-mono text-[13px] text-soft border border-border rounded-[8px] px-3 py-1.5 hover:text-accent hover:border-accent transition-colors duration-150 no-underline"
          >
            <span>Vai al sito</span>
            <ArrowUpRight className="size-[15px]" />
          </Link>
          <span className="w-px h-[22px] bg-border hidden md:block" />
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
                    "font-mono text-[19px] py-4 border-b border-border/60 no-underline transition-colors duration-150",
                    isActive(item.href)
                      ? "text-accent"
                      : "text-soft hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between font-mono text-[19px] py-4 border-b border-border/60 text-soft hover:text-foreground no-underline transition-colors duration-150"
              >
                <span>Vai al sito</span>
                <ArrowUpRight className="size-[19px]" />
              </Link>
            </nav>

            <div className="px-6 py-5 border-t border-border shrink-0">
              <div className="flex items-center gap-3 font-mono text-[15px] text-soft">
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
