"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ExternalLink, Menu } from "lucide-react";
import { cn } from "@/presentation/lib/utils";
import { Button } from "@/presentation/components/ui/button";
import { Container } from "@/presentation/components/shared/container";
import { LogoLockup } from "@/presentation/components/shared/logo";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";
import { GoogleQuotaBadge } from "@/presentation/features/admin/google-quota-badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/presentation/components/ui/sheet";

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

  const activeHref = navItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (href: string) => href === activeHref;

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-[14px] border-b border-border">
      <Container className="max-w-none h-14 flex items-center justify-between gap-4">
        {/* Left: logo + desktop nav */}
        <div className="flex items-stretch gap-6 min-w-0">
          <Link href="/admin/quotes" className="shrink-0 self-center">
            <LogoLockup size={15} />
          </Link>

          <nav className="hidden lg:flex items-stretch gap-6 self-stretch">
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

        {/* Right: quota badge + theme + site link · divider · hamburger · avatar */}
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
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Apri il menu"
                className="lg:hidden flex items-center justify-center size-9 -mr-1 rounded-[9px] text-soft hover:text-foreground hover:bg-raised transition-colors duration-150 border-none bg-transparent cursor-pointer"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85%] max-w-[340px] gap-0 p-0"
            >
              <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
              <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
                <LogoLockup size={15} />
              </div>

              <nav className="flex flex-col flex-1 overflow-y-auto px-5 py-3">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "font-sans text-[19px] py-4 border-b border-border/60 no-underline transition-colors duration-150",
                        active
                          ? "font-semibold text-accent"
                          : "text-soft hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between font-sans text-[19px] py-4 border-b border-border/60 text-soft hover:text-foreground no-underline transition-colors duration-150"
                >
                  <span>Vai al sito</span>
                  <ExternalLink className="size-[19px]" />
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex items-center">
            <UserButton />
          </div>
        </div>
      </Container>
    </header>
  );
}