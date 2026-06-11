import { SERVICE_CATALOG } from "@/infrastructure/catalog/catalog.data";
import { Container } from "@/presentation/components/shared/container";
import { QuoteComposer } from "@/presentation/features/admin/quote-composer";

export default function NewQuotePage() {
  return (
    <Container className="max-w-[1100px] py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-8 text-foreground">
        Nuovo preventivo
      </h1>
      <QuoteComposer catalog={SERVICE_CATALOG} />
    </Container>
  );
}
