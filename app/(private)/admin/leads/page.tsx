import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderOpenIcon, CrossIcon } from "@hugeicons/core-free-icons";
import { leadRepository } from "@/infrastructure/container";
import { Container } from "@/presentation/components/shared/container";
import { Button } from "@/presentation/components/ui/button";
import { resolveJobStatus } from "@/domain/lead/lead.job";
import { hasCriteria, leadMatchesCriteria } from "@/domain/lead/lead.criteria";
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
  parseOutreachStatusFilter,
  parseScoreFilter,
  parseSourceFilter,
  parseAdsFilter,
  parseSortOption,
  parseTechStackFilter,
  parseYearFilter,
  uniqueTechStacks,
  uniqueCopyrightYears,
} from "@/presentation/features/admin/leads/lead-filters";
import {
  LeadTable,
  type LeadTableRow,
} from "@/presentation/features/admin/leads/lead-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 8;

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
    outreachStatus: parseOutreachStatusFilter(param("outreach")),
    score: parseScoreFilter(param("score")),
    source: parseSourceFilter(param("source")),
    ads: parseAdsFilter(param("ads")),
    q: (param("q") ?? "").trim(),
    sort: parseSortOption(param("sort")),
    techStack: parseTechStackFilter(param("tech")),
    copyrightFrom: parseYearFilter(param("year-from")),
    copyrightTo: parseYearFilter(param("year-to")),
  };

  const rawPage = parseInt(param("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Persist the failed status for jobs whose worker died, so the toolbar does
  // not keep offering a re-run on a job that will never complete.
  await reconcileStaleJobs({ repository: leadRepository });
  const jobs = (await leadRepository.findAllJobs()).map((job) =>
    resolveJobStatus(job)
  );
  // Newest in-progress jobs (repository returns them newest-first). Used to
  // auto-focus a running search and to render the live progress panel.
  const runningJobs = jobs.filter(
    (job) => job.status === "pending" || job.status === "running"
  );
  const requestedJobId = param("job");
  // No auto-selection here: while a search runs, opening /admin/leads must
  // keep showing ALL results (a running job is surfaced by the "Ricerche in
  // corso" panel below, and by the progress banner when it's the active one).
  const activeJob = requestedJobId
    ? jobs.find((job) => job.id === requestedJobId)
    : undefined;
  const jobId = activeJob ? activeJob.id : undefined;
  const activeJobRunning =
    activeJob?.status === "pending" || activeJob?.status === "running";

  // `totalFound` on the job is the raw discovery count; the table, however,
  // counts the leads actually persisted for the job (deduplication skips leads
  // already captured by another search). Use the persisted count so the card
  // and the toolbar show the same number the table returns.
  const persistedCounts = await leadRepository.countLeadsByJobIds(
    jobs.map((j) => j.id)
  );

  const matchingLeads = await leadRepository.findMatchingLeads({
    status: filters.status,
    outreachStatus: filters.outreachStatus,
    source: filters.source,
    jobId,
    q: filters.q || undefined,
  });
  // The job's tech/copyright criteria never discard leads at save time: they
  // only narrow what this view shows, while non-matching leads stay stored.
  const activeCriteria =
    activeJob && hasCriteria(activeJob)
      ? { techStack: activeJob.techStack, copyright: activeJob.copyright }
      : undefined;
  const criteriaLeads = activeCriteria
    ? matchingLeads.filter((lead) => leadMatchesCriteria(lead, activeCriteria))
    : matchingLeads;
  const hiddenByCriteria = matchingLeads.length - criteriaLeads.length;
  const hasActiveJob = runningJobs.length > 0;

  const latestAnalyses = await leadRepository.findLatestAnalysesByLeadIds(
    criteriaLeads.map((l) => l.id)
  );
  const analysisByLeadId = new Map(
    latestAnalyses.map((a) => [a.leadId, a])
  );

  const rows: LeadTableRow[] = criteriaLeads.map((lead) => {
    const analysis = analysisByLeadId.get(lead.id);
    return {
      lead,
      score: analysis?.performanceScore ?? undefined,
    };
  });

  // Distinct options for the advanced filters (tech stack multiselect and
  // copyright year range), derived from the lead set the user can reach.
  const availableTechStacks = uniqueTechStacks(criteriaLeads);
  const availableYears = uniqueCopyrightYears(criteriaLeads);

  // Score filter and column sort run on the FULL matching set, so the order is
  // stable across pages and the count reflects every active filter — not just
  // the current page loaded by the repository.
  const visibleRows = sortLeads(filterLeads(rows, filters), filters.sort);

  const total = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visibleRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const listQuery = (overrides: Record<string, string>) =>
    new URLSearchParams({
      ...(filters.status !== "all" && { status: filters.status }),
      ...(filters.outreachStatus !== "all" && { outreach: filters.outreachStatus }),
      ...(filters.score !== "all" && { score: filters.score }),
      ...(filters.source !== "all" && { source: filters.source }),
      ...(filters.ads !== "all" && { ads: filters.ads }),
      ...(filters.techStack.length > 0 && {
        tech: filters.techStack.join(","),
      }),
      ...(filters.copyrightFrom !== undefined && {
        "year-from": String(filters.copyrightFrom),
      }),
      ...(filters.copyrightTo !== undefined && {
        "year-to": String(filters.copyrightTo),
      }),
      ...(filters.q && { q: filters.q }),
      ...(filters.sort !== "date-desc" && { sort: filters.sort }),
      ...(jobId && { job: jobId }),
      ...overrides,
    }).toString();

  const pageHref = (pageNumber: number) =>
    `/admin/leads?${listQuery({ page: String(pageNumber) })}`;

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.outreachStatus !== "all" ||
    filters.score !== "all" ||
    filters.source !== "all" ||
    filters.ads !== "all" ||
    filters.techStack.length > 0 ||
    filters.copyrightFrom !== undefined ||
    filters.copyrightTo !== undefined ||
    filters.q !== "" ||
    jobId !== undefined;

  const toolbarJobs: ToolbarJob[] = jobs.map((job: LeadGenerationJob) => ({
    id: job.id,
    query: job.query,
    location: job.location,
    status: job.status,
    totalFound: persistedCounts.get(job.id) ?? job.totalFound,
    analyzed: job.analyzed,
    qualified: job.qualified,
    favorite: job.favorite ?? false,
    error: job.error,
    createdAt: job.createdAt,
  }));

  return (
    <Container className="h-full max-w-[1400px] py-4">
      <LiveJobRefresher active={hasActiveJob} />

      <section className="flex h-full flex-col gap-3 overflow-hidden">
        <LeadFilterBar
          status={filters.status}
          outreach={filters.outreachStatus}
          score={filters.score}
          source={filters.source}
          ads={filters.ads}
          q={filters.q}
          jobs={toolbarJobs}
          activeJobId={jobId}
          techStack={filters.techStack}
          copyrightFrom={filters.copyrightFrom}
          copyrightTo={filters.copyrightTo}
          availableTechStacks={availableTechStacks}
          availableYears={availableYears}
        />

        {runningJobs.some((job) => job.id !== jobId) && (
          <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/[0.04] px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin text-accent"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                Ricerche in corso
              </span>
              <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">
                {runningJobs.length === 1
                  ? "1 ricerca attiva"
                  : `${runningJobs.length} ricerche attive`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {runningJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/leads?job=${job.id}`}
                  aria-current={job.id === jobId ? "page" : undefined}
                  className="flex items-center gap-3 rounded-lg border border-border/80 bg-surface px-3 py-2 transition-colors hover:border-accent/40"
                >
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] rounded-full border border-accent/40 px-2 py-[2px] text-accent">
                    {job.status === "pending" ? "in coda" : "in corso"}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-space text-[13px] font-semibold text-foreground truncate">
                      {job.query}
                    </span>
                    {job.location && (
                      <span className="font-mono text-[11px] text-dim truncate">
                        {job.location}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-muted tabular-nums">
                    {job.totalFound} trovati · {job.analyzed} analizzati ·{" "}
                    {job.qualified} qualificati
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeJob && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-accent/40 bg-accent/[0.04] px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <HugeiconsIcon
                icon={FolderOpenIcon}
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-accent"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                  Risultati filtrati
                </span>
                <span className="font-space text-[14px] font-semibold text-foreground truncate">
                  {activeJob.query}
                </span>
                {activeJob.location && (
                  <span className="font-mono text-[11px] text-dim truncate">
                    {activeJob.location}
                  </span>
                )}
                {activeCriteria && (
                  <span className="font-mono text-[11px] text-muted truncate">
                    Criteri:{" "}
                    {activeCriteria.techStack &&
                      `tech "${activeCriteria.techStack}"`}
                    {activeCriteria.techStack && activeCriteria.copyright && " · "}
                    {activeCriteria.copyright &&
                      `footer "${activeCriteria.copyright}"`}
                  </span>
                )}
                {activeJobRunning ? (
                  <span className="mt-1 inline-flex items-center gap-2 font-mono text-[12px] text-muted">
                    <svg
                      className="animate-spin text-accent"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M22 12a10 10 0 0 1-10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="tabular-nums">
                      {activeJob.totalFound} trovati · {activeJob.analyzed}{" "}
                      analizzati · {activeJob.qualified} qualificati
                    </span>
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-muted">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="opacity-70 shrink-0">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    {activeCriteria
                      ? `${total} lead corrispondono ai criteri${
                          hiddenByCriteria > 0
                            ? ` · ${hiddenByCriteria} salvati ma non corrispondono`
                            : ""
                        }`
                      : `${total} lead trovati da questa ricerca`}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 text-accent hover:bg-accent/10 hover:text-accent"
            >
              <Link href="/admin/leads">
                <HugeiconsIcon icon={CrossIcon} size={14} aria-hidden />
                Togli filtro
              </Link>
            </Button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <LeadTable
            rows={pageRows}
            emptyRow={
              total === 0 && !hasActiveFilters ? (
                <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <p className="font-hanken text-soft">
                    Nessun lead ancora. Avvia la prima ricerca nella tua nicchia.
                  </p>
                  <Button variant="ghost" asChild>
                    <Link href="/admin/leads/new">+ Nuova ricerca</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <p className="m-0 font-hanken text-soft">
                    Nessun lead corrisponde ai filtri selezionati.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/admin/leads/new">+ Nuova ricerca</Link>
                  </Button>
                  {hasActiveFilters && (
                    <Link
                      href="/admin/leads"
                      className="font-mono text-[12px] text-muted underline underline-offset-4 hover:text-foreground"
                    >
                      Torna a tutti i lead
                    </Link>
                  )}
                </div>
              )
            }
          />
        </div>

        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
            <span className="font-mono text-[11px] text-muted">
              Pagina {currentPage} di {totalPages} · {total} lead totali
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                asChild={currentPage > 1}
              >
                {currentPage > 1 ? (
                  <Link href={pageHref(currentPage - 1)}>← Precedente</Link>
                ) : (
                  "← Precedente"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                asChild={currentPage < totalPages}
              >
                {currentPage < totalPages ? (
                  <Link href={pageHref(currentPage + 1)}>Successiva →</Link>
                ) : (
                  "Successiva →"
                )}
              </Button>
            </div>
          </div>
        )}
      </section>
    </Container>
  );
}