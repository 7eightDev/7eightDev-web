import { notFound } from "next/navigation";
import Link from "next/link";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { LeadDetail } from "@/presentation/features/admin/leads/lead-detail";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await leadRepository.findById(id);
  if (!lead) notFound();

  const analyses = await leadRepository.findAnalysesByLeadId(id);

  return (
    <Container className="max-w-[760px] py-12">
      <Link
        href="/admin/leads"
        className="font-mono text-[13px] text-soft hover:text-accent transition-colors duration-150 no-underline"
      >
        ← Torna alla lista
      </Link>
      <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] mt-4 mb-8 text-foreground">
        Dettaglio lead
      </h1>
      <LeadDetail lead={lead} analyses={analyses} />
    </Container>
  );
}