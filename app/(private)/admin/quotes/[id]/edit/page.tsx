import { notFound, redirect } from "next/navigation";
import { catalogRepository, quoteRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { QuoteComposer } from "@/presentation/features/admin/quote-composer";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await quoteRepository.findById(id);

  if (!quote) notFound();
  // Only drafts are editable; a sent/accepted quote is frozen.
  if (quote.status !== "draft") redirect("/admin/quotes");

  const catalog = await catalogRepository.findAll();

  return (
    <Container className="max-w-275 py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-2 text-foreground text-center w-full">
        Modifica preventivo
      </h1>
      <p className="font-mono text-[13px] text-muted text-center mb-8">
        {quote.number} · bozza
      </p>
      <QuoteComposer catalog={catalog} quote={quote} />
    </Container>
  );
}
