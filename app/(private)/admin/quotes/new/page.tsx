import { catalogRepository } from '@/infrastructure/container';
import { Container } from '@/presentation/components/shared/container';
import { QuoteComposer } from '@/presentation/features/admin/quote-composer';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const catalog = await catalogRepository.findAll();
  return (
    <Container className="max-w-275 py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-8 text-foreground text-center w-full">
        Nuovo preventivo
      </h1>
      <QuoteComposer catalog={catalog} />
    </Container>
  );
}
