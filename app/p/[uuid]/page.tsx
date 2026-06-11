import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { quoteRepository } from "@/infrastructure/container";
import { QuoteView } from "@/presentation/features/quote/quote-view";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uuid } = await params;
  const quote = await quoteRepository.findById(uuid);
  if (!quote) return { title: "Preventivo — 7eightDev" };
  return {
    title: `Preventivo · ${quote.client.name} — 7eightDev`,
    robots: { index: false, follow: false },
  };
}

export default async function QuotePage({ params }: PageProps) {
  const { uuid } = await params;
  const quote = await quoteRepository.findById(uuid);
  if (!quote) notFound();

  return <QuoteView quote={quote} />;
}
