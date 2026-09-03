import { Container } from "@/presentation/components/shared/container";
import { LeadSearchForm } from "@/presentation/features/admin/leads/lead-search-form";

export default function NewLeadSearchPage() {
  return (
    <Container className="max-w-[760px] py-12">
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mb-8 text-foreground">
        Nuova ricerca lead
      </h1>
      <LeadSearchForm />
    </Container>
  );
}