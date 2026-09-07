import Link from "next/link";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { Button } from "@/presentation/components/ui/button";
import { resolveJobStatus } from "@/domain/lead/lead.job";
import type { LeadGenerationJob } from "@/domain/lead/lead.types";
import { reconcileStaleJobs } from "@/application/lead/reconcile-stale-jobs";
import { LiveJobRefresher } from "@/presentation/features/admin/leads/live-job-refresher";
import {
  LeadFilterBar,
  type ToolbarJob,
} from "@/presentation/features/admin/leads/lead-filter-bar";
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

const PAGE_SIZE = 10;

export default async function LeadsPage({
  searchParams,
}: {
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

  const rawPage = parseInt(param("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Persist the failed status for jobs whose worker died, so the toolbar does
  // not keep offering a re-run on a job that will never complete.
  await reconcileStaleJobs({ repository: leadRepository });
  const jobs = (await leadRepository.findAllJobs()).map((job) =>
    resolveJobStatus(job)
  );
  const requestedJobId = param("job");
  const activeJob = requestedJobId
    ? jobs.find((job) => job.id === requestedJobId)
    : undefined;
  const jobId = activeJob ? activeJob.id : undefined;

  const { leads, total } = await leadRepository.findPaginated({
    page,
    pageSize: PAGE_SIZE,
    status: filters.status,
    source: filters.source,
    jobId,
    q: filters.q || undefined,
  });
  const hasActiveJob = jobs.some(
    (job) => job.status === "pending" || job.status === "running"
  );

  const latestAnalyses = await leadRepository.findLatestAnalysesByLeadIds(
    leads.map((l) => l.id)
  );
  const analysisByLeadId = new Map(
    latestAnalyses.map((a) => [a.leadId, a])
  );

  const rows: LeadTableRow[] = leads.map((lead) => {
    const analysis = analysisByLeadId.get(lead.id);
    return {
      lead,
      score: analysis?.performanceScore ?? undefined,
    };
  });

  const visibleRows = sortLeads(filterLeads(rows, filters), filters.sort);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const listQuery = (overrides: Record<string, string>) =>
    new URLSearchParams({
      ...(filters.status !== "all" && { status: filters.status }),
      ...(filters.score !== "all" && { score: filters.score }),
      ...(filters.source !== "all" && { source: filters.source }),
      ...(filters.q && { q: filters.q }),
      ...(filters.sort !== "date-desc" && { sort: filters.sort }),
      ...(jobId && { job: jobId }),
      ...overrides,
    }).toString();

  const pageHref = (pageNumber: number) =>
    `/admin/leads?${listQuery({ page: String(pageNumber) })}`;

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.score !== "all" ||
    filters.source !== "all" ||
    filters.q !== "" ||
    jobId !== undefined;

  const toolbarJobs: ToolbarJob[] = jobs.map((job: LeadGenerationJob) => ({
    id: job.id,
    query: job.query,
    location: job.location,
    status: job.status,
    totalFound: job.totalFound,
    analyzed: job.analyzed,
    qualified: job.qualified,
    favorite: job.favorite ?? false,
  }));

  return (
    <Container className="max-w-[1400px] py-10">
      <LiveJobRefresher active={hasActiveJob} />

      <section className="mt-2 flex flex-col gap-3">
        <LeadFilterBar
          status={filters.status}
          score={filters.score}
          source={filters.source}
          q={filters.q}
          jobs={toolbarJobs}
          activeJobId={jobId}
        />

        {total === 0 && visibleRows.length === 0 && !hasActiveFilters ? (
          <div className="p-10 rounded-2xl bg-surface border border-border text-center mt-4">
            <p className="font-hanken text-soft mb-4">
              Nessun lead ancora. Avvia la prima ricerca nella tua nicchia.
            </p>
            <Button variant="ghost" asChild>
              <Link href="/admin/leads/new">+ Nuova ricerca</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {visibleRows.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface border border-border text-center">
                <div className="flex flex-col items-center gap-3">
                  <p className="font-hanken text-soft m-0">
                    Nessun lead corrisponde ai filtri selezionati.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/admin/leads/new">+ Nuova ricerca</Link>
                  </Button>
                </div>
                {hasActiveFilters && (
                  <Link
                    href="/admin/leads"
                    className="inline-block mt-4 font-mono text-[12px] text-muted hover:text-foreground underline underline-offset-4"
                  >
                    Torna a tutti i lead
                  </Link>
                )}
              </div>
            ) : (
              <LeadTable
                rows={visibleRows}
                footer={
                  totalPages > 1 ? (
                    <>
                      <span className="font-mono text-[11px] text-muted">
                        Pagina {page} di {totalPages} · {total} lead totali
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          asChild={page > 1}
                        >
                          {page > 1 ? (
                            <Link href={pageHref(page - 1)}>← Precedente</Link>
                          ) : (
                            "← Precedente"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          asChild={page < totalPages}
                        >
                          {page < totalPages ? (
                            <Link href={pageHref(page + 1)}>Successiva →</Link>
                          ) : (
                            "Successiva →"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : undefined
                }
              />
            )}
          </div>
        )}
      </section>
    </Container>
  );
}