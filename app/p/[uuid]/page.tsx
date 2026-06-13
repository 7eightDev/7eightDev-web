import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { quoteRepository } from "@/infrastructure/container";
import { QuoteView } from "@/presentation/features/quote/quote-view";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

/**
 * Per-request memoized read: `generateMetadata` and the page component both
 * need the same quote, but run as two passes. React `cache()` dedupes them to
 * a single repository (DB) call per request — no double round-trip to Postgres.
 */
const getQuote = cache((uuid: string) => quoteRepository.findById(uuid));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uuid } = await params;
  const quote = await getQuote(uuid);
  if (!quote) return { title: "Preventivo — 7eightDev" };
  return {
    title: `Preventivo · ${quote.client.name} — 7eightDev`,
    robots: { index: false, follow: false },
  };
}

export default async function QuotePage({ params }: PageProps) {
  const { uuid } = await params;
  const quote = await getQuote(uuid);
  if (!quote) notFound();

  return <QuoteView quote={quote} />;
}
