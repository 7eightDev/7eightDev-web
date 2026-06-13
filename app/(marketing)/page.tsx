import { Hero } from "@/presentation/features/landing/hero";
import { Dual } from "@/presentation/features/landing/dual";
import { Metodo } from "@/presentation/features/landing/metodo";
import { Stack } from "@/presentation/features/landing/stack";
import { Processo } from "@/presentation/features/landing/processo";
import { CtaBand } from "@/presentation/features/landing/cta-band";
import { Footer } from "@/presentation/features/landing/footer";

export default function Home() {
  return (
    <div className="bg-background min-h-screen text-foreground">
      <main>
        <Hero />
        <Dual />
        <Metodo />
        <Stack />
        <Processo />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
