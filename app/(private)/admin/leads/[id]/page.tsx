import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { LeadDetail } from "@/presentation/features/admin/leads/lead-detail";
import { LeadCreateQuoteButton } from "@/presentation/features/admin/leads/lead-create-quote-button";
import { LeadSendAuditButton } from "@/presentation/features/admin/leads/lead-send-audit-button";
import { cn } from "@/presentation/lib/utils";
import {
  QUALIFICATION_LABEL,
  getStatusBadgeClass,
} from "@/presentation/features/admin/leads/lead-dialog-utils";
import type { Lead } from "@/domain/lead/lead.types";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={cn(
        "font-mono text-[11.5px] tracking-[0.08em] uppercase rounded-full px-3 py-[3px] border",
        getStatusBadgeClass(status)
      )}
    >
      {QUALIFICATION_LABEL[status]}
    </span>
  );
}

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
    <Container className="max-w-[1400px] py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/leads"
            aria-label="Torna alla lista"
            className="inline-flex items-center justify-center size-9 rounded-lg text-soft hover:text-foreground hover:bg-raised transition-colors duration-150 no-underline shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground m-0 truncate">
            {lead.companyName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={lead.status} />
          <LeadSendAuditButton
            leadId={lead.id}
            companyName={lead.companyName}
            recipientEmail={lead.email}
          />
          {lead.status === "qualified" && (
            <LeadCreateQuoteButton leadId={lead.id} />
          )}
        </div>
      </div>
      <LeadDetail lead={lead} analyses={analyses} />
    </Container>
  );
}