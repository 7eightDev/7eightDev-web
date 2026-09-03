import Link from "next/link";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { LeadJobStatus } from "@/presentation/features/admin/leads/lead-job-status";
import {
  LeadTable,
  type LeadTableRow,
} from "@/presentation/features/admin/leads/lead-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await leadRepository.findAll();
  const jobs = await leadRepository.findAllJobs();

  const rows: LeadTableRow[] = await Promise.all(
    leads.map(async (lead) => {
      const analyses = await leadRepository.findAnalysesByLeadId(lead.id);
      const latest = analyses[0];
      return {
        lead,
        score: latest?.performanceScore ?? undefined,
      };
    })
  );

  return (
    <Container className="max-w-[1100px] py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground">
          Lead
        </h1>
        <Link
          href="/admin/leads/new"
          className="font-mono text-sm font-semibold rounded-full bg-accent text-[#0a0b0d] transition-all duration-150 hover:brightness-105 hover:-translate-y-px flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-[9px]"
        >
          <span className="sm:hidden text-lg">+</span>
          <span className="hidden sm:inline">+ Nuova ricerca</span>
        </Link>
      </div>

      {jobs.length > 0 && (
        <section className="mb-8 flex flex-col gap-3">
          <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
            Ricerche recenti · {jobs.length}
          </h2>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <LeadJobStatus key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="p-10 rounded-2xl bg-surface border border-border text-center">
          <p className="font-hanken text-soft mb-4">
            Nessun lead ancora. Avvia la prima ricerca nella tua nicchia.
          </p>
          <Link
            href="/admin/leads/new"
            className="font-mono text-sm font-semibold text-accent hover:underline"
          >
            + Nuova ricerca
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
            Tutti i lead · {rows.length}
          </h2>
          <LeadTable rows={rows} />
        </section>
      )}
    </Container>
  );
}