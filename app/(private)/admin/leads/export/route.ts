import { exportQualifiedLeadsCsv } from "@/application/lead/export-leads";
import { leadRepository, exportRateLimiter } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

/**
 * GET /admin/leads/export — streams the qualified leads as a CSV download.
 * Auth is enforced by the Clerk proxy on the `(private)` area.
 */
export async function GET(): Promise<Response> {
  if (!exportRateLimiter.allow("export")) {
    return new Response("Troppe richieste. Riprova tra qualche secondo.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const csv = await exportQualifiedLeadsCsv(leadRepository);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="leads-qualificati.csv"',
    },
  });
}