import Link from "next/link";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { Button } from "@/presentation/components/ui/button";
import { resolveJobStatus } from "@/domain/lead/lead.job";
import { LeadJobStatus } from "@/presentation/features/admin/leads/lead-job-status";
import { LiveJobRefresher } from "@/presentation/features/admin/leads/live-job-refresher";
import { LeadFilterBar } from "@/presentation/features/admin/leads/lead-filter-bar";
import {
  filterLeads,
  sortLeads,
  parseLeadStatusFilter,
  parseScoreFilter,
  parseSourceFilter,
  parseSortOption,
} from "@/presentation/features/admin/leads/lead-filters";
import {
  LeadTable,
  type LeadTableRow,
} from "@/presentation/features/admin/leads/lead-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  // Next.js 16: searchParams is async. Filters are read from the URL so this
  // stays a Server Component and the filtered view is shareable/bookmarkable.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const param = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const filters = {
    status: parseLeadStatusFilter(param("status")),
    score: parseScoreFilter(param("score")),
    source: parseSourceFilter(param("source")),
    q: (param("q") ?? "").trim(),
    sort: parseSortOption(param("sort")),
  };

  const leads = await leadRepository.findAll();
  const rawJobs = await leadRepository.findAllJobs();
  // Recover jobs whose worker died (serverless timeout/crash): a non-terminal
  // job older than the threshold is surfaced as failed instead of polling
  // forever. `resolveJobStatus` is the read-time safety net for this.
  const jobs = rawJobs.map((job) => resolveJobStatus(job));
  const hasActiveJob = jobs.some(
    (job) => job.status === "pending" || job.status === "running"
  );

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

  const visibleRows = sortLeads(filterLeads(rows, filters), filters.sort);

  return (
    <Container className="max-w-[1100px] py-12">
      <LiveJobRefresher active={hasActiveJob} />
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-space text-3xl font-semibold tracking-[-0.02em] text-foreground">
          Lead
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/leads/export">
              <span className="hidden sm:inline">Esporta CSV</span>
              <span className="sm:hidden text-lg">↓</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/leads/new">
              <span className="sm:hidden text-lg">+</span>
              <span className="hidden sm:inline">+ Nuova ricerca</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
      {jobs.length > 0 && (
        <aside className="lg:sticky lg:top-6 flex flex-col gap-3 lg:order-1">
          <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
            Ricerche recenti
          </h2>
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <LeadJobStatus key={job.id} job={job} />
            ))}
          </div>
        </aside>
      )}

      <div className="lg:order-2 min-w-0">
      {rows.length === 0 ? (
        <div className="p-10 rounded-2xl bg-surface border border-border text-center">
          <p className="font-hanken text-soft mb-4">
            Nessun lead ancora. Avvia la prima ricerca nella tua nicchia.
          </p>
          <Button variant="ghost" asChild>
            <Link href="/admin/leads/new">+ Nuova ricerca</Link>
          </Button>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <LeadFilterBar
            status={filters.status}
            score={filters.score}
            source={filters.source}
            q={filters.q}
            sort={filters.sort}
          />

          <h2 className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted">
            {filters.q || filters.status !== "all" || filters.score !== "all" || filters.source !== "all"
              ? `${visibleRows.length} ${visibleRows.length === 1 ? "lead" : "lead"} su ${rows.length}`
              : `Tutti i lead · ${rows.length}`}
          </h2>

          {visibleRows.length === 0 ? (
            <div className="p-10 rounded-2xl bg-surface border border-border text-center">
              <p className="font-hanken text-soft">
                Nessun lead corrisponde ai filtri selezionati.
              </p>
            </div>
          ) : (
            <LeadTable rows={visibleRows} />
          )}
        </section>
      )}
      </div>
      </div>
    </Container>
  );
}