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
        <Container className="max-w-[1100px] h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/admin/quotes">
              <LogoLockup size={15} />
            </Link>
            <span className="w-px h-[22px] bg-border hidden sm:block" />
            <span className="font-mono text-[13px] text-soft hidden sm:block">admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <UserButton />
            </div>
          </div>
        </Container>
      </header>
      <main>{children}</main>
    </ClerkProvider>
  );
}
