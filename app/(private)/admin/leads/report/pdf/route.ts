import type { NextRequest } from "next/server";
import { leadReportGenerator, leadRepository } from "@/infrastructure/container";
import { findLeadReportScenario } from "@/infrastructure/lead/lead-email-preview.fixtures";
import type { Lead, LeadAnalysis } from "@/domain/lead/lead.types";

export const dynamic = "force-dynamic";

/**
 * Streams the generated PDF audit report for a real lead (`?lead=<uuid>`) or a
 * dev fixture (`?fixture=<id>`). Used by the admin report preview studio to
 * download and inspect the exact bytes that get attached to the presentation
 * email. Lives under the Clerk-protected `(private)` group.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadParam = searchParams.get("lead");
  const fixtureParam = searchParams.get("fixture");

  let lead: Lead;
  let analysis: LeadAnalysis;

  if (leadParam) {
    const found = await leadRepository.findById(leadParam);
    if (!found) {
      return new Response("Lead non trovato.", { status: 404 });
    }
    const analyses = await leadRepository.findAnalysesByLeadId(leadParam);
    const latest = analyses[0];
    if (!latest) {
      return new Response("Nessuna analisi disponibile per questo lead.", {
        status: 404,
      });
    }
    lead = found;
    analysis = latest;
  } else if (fixtureParam) {
    const scenario = findLeadReportScenario(fixtureParam);
    if (!scenario) {
      return new Response("Scenario dimostrativo non trovato.", { status: 404 });
    }
    lead = scenario.lead;
    analysis = scenario.analysis;
  } else {
    return new Response("Parametro `lead` o `fixture` mancante.", { status: 400 });
  }

  try {
    const { pdf, filename } = await leadReportGenerator.generateReport({
      lead,
      analysis,
      generatedAt: new Date().toISOString(),
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new Response(`Generazione del report non riuscita: ${message}`, {
      status: 500,
    });
  }
}