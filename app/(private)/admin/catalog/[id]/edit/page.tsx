import { notFound } from "next/navigation";
import { catalogRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { CatalogItemForm } from "@/presentation/features/admin/catalog-item-form";

export const dynamic = "force-dynamic";

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await catalogRepository.findById(id);
  if (!item) notFound();

  return (
    <Container className="max-w-[760px] py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-2 text-foreground">
        Modifica voce
      </h1>
      <p className="font-mono text-[13px] text-muted mb-8">{item.id}</p>
      <CatalogItemForm item={item} />
    </Container>
  );
}
