import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Home } from "lucide-react";
import { Container } from "@/presentation/components/shared/container";
import { LogoLockup } from "@/presentation/components/shared/logo";

export const metadata = {
  title: "Admin — 7eightDev",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] border-b border-border">
        <Container className="max-w-[1100px] h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/admin/quotes">
              <LogoLockup size={15} />
            </Link>
            <span className="w-px h-[22px] bg-border hidden sm:block" />
            <nav className="flex items-center gap-3">
              <Link
                href="/admin/quotes"
                className="font-mono text-[13px] text-soft hover:text-foreground transition-colors duration-150 no-underline"
              >
                Preventivi
              </Link>
              <Link
                href="/admin/catalog"
                className="font-mono text-[13px] text-soft hover:text-foreground transition-colors duration-150 no-underline"
              >
                Catalogo
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Torna alla home del sito"
              title="Home del sito"
              className="flex items-center gap-2 font-mono text-[13px] text-soft hover:text-foreground transition-colors duration-150 no-underline"
            >
              <Home className="size-4" />
              <span className="hidden sm:block">Sito</span>
            </Link>
            <span className="w-px h-[22px] bg-border hidden sm:block" />
            <div className="shrink-0">
              <UserButton />
            </div>
          </div>
        </Container>
      </header>
      <main>{children}</main>
    </>
  );
}
