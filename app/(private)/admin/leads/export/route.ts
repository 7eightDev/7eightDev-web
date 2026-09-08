import { exportLeadsCsv } from "@/application/lead/export-leads";
import {
  parseLeadStatusFilter,
  parseSourceFilter,
  parseTechStackFilter,
  parseYearFilter,
} from "@/presentation/features/admin/leads/lead-filters";
import { leadRepository, exportRateLimiter } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

/**
 * GET /admin/leads/export — streams as CSV the leads matching the same filter
 * context as the list (job, status, source, free-text). Auth is enforced by
 * the Clerk proxy on the `(private)` area.
 */
export async function GET(request: Request): Promise<Response> {
  if (!exportRateLimiter.allow("export")) {
    return new Response("Troppe richieste. Riprova tra qualche secondo.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const params = new URL(request.url).searchParams;
  const csv = await exportLeadsCsv(leadRepository, {
    status: parseLeadStatusFilter(params.get("status") ?? undefined),
    source: parseSourceFilter(params.get("source") ?? undefined),
    q: (params.get("q") ?? "").trim(),
    jobId: params.get("job") ?? undefined,
    techStack: parseTechStackFilter(params.get("tech") ?? undefined),
    copyrightFrom: parseYearFilter(params.get("year-from") ?? undefined),
    copyrightTo: parseYearFilter(params.get("year-to") ?? undefined),
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="leads-qualificati.csv"',
    },
  });
}