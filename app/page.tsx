"use client";

import { useState } from "react";
import { Nav } from "@/presentation/features/landing/nav";
import { Hero } from "@/presentation/features/landing/hero";
import { Dual } from "@/presentation/features/landing/dual";
import { Metodo } from "@/presentation/features/landing/metodo";
import { Stack } from "@/presentation/features/landing/stack";
import { Processo } from "@/presentation/features/landing/processo";
import { CtaBand } from "@/presentation/features/landing/cta-band";
import { Footer } from "@/presentation/features/landing/footer";
import { QuoteModal } from "@/presentation/features/landing/quote-modal";

export default function Home() {
  const [quote, setQuote] = useState(false);
  const openQuote = () => setQuote(true);

  return (
    <div className="bg-background min-h-screen text-foreground">
      <Nav onQuote={openQuote} />
      <main>
        <Hero onQuote={openQuote} />
        <Dual />
        <Metodo />
        <Stack />
        <Processo />
        <CtaBand onQuote={openQuote} />
      </main>
      <Footer onQuote={openQuote} />
      <QuoteModal open={quote} onClose={() => setQuote(false)} />
    </div>
  );
}
