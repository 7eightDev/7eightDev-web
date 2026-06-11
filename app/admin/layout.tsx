import { ClerkProvider, UserButton } from "@clerk/nextjs";
import Link from "next/link";
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
    <ClerkProvider>
      <header className="sticky top-0 z-40 bg-[rgba(10,11,13,0.85)] backdrop-blur-[14px] border-b border-border">
        <Container className="max-w-[1100px] h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/quotes">
              <LogoLockup size={15} />
            </Link>
            <span className="w-px h-[22px] bg-border" />
            <span className="font-mono text-[13px] text-soft">admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/quotes/new"
              className="font-mono text-sm font-semibold px-4 py-[9px] rounded-[9px] bg-accent text-[#0a0b0d] transition-all duration-150 hover:brightness-105 hover:-translate-y-px"
            >
              + Nuovo preventivo
            </Link>
            <UserButton />
          </div>
        </Container>
      </header>
      <main>{children}</main>
    </ClerkProvider>
  );
}
