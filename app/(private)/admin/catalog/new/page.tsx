import { Container } from "@/presentation/components/shared/container";
import { CatalogItemForm } from "@/presentation/features/admin/catalog-item-form";

export default function NewCatalogItemPage() {
  return (
    <Container className="max-w-[760px] py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-8 text-foreground">
        Nuova voce di catalogo
      </h1>
      <CatalogItemForm />
    </Container>
  );
}
