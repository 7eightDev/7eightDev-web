import { exportQualifiedLeadsCsv } from "@/application/lead/export-leads";
import { leadRepository } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

/**
 * GET /admin/leads/export — streams the qualified leads as a CSV download.
 * Auth is enforced by the Clerk proxy on the `(private)` area.
 */
export async function GET(): Promise<Response> {
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