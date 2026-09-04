"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startRunLeadJob } from "@/application/lead/start-run-lead-job";
import { createQuoteFromLead } from "@/application/lead/create-quote-from-lead";
import { createQuote } from "@/application/quote/create-quote";
import {
  catalogRepository,
  leadDiscovery,
  leadRepository,
  pageSpeedAnalyzer,
  quoteRepository,
} from "@/infrastructure/container";

export interface LeadActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

interface StartLeadGenerationInput {
  readonly query: string;
  readonly location: string;
  readonly quantity?: number;
}

/** Server action: kick off a lead generation search (query + location + quantity). */
export async function startLeadGenerationAction(
  input: StartLeadGenerationInput
): Promise<LeadActionResult> {
  await startRunLeadJob(
    {
      discovery: leadDiscovery,
      pageSpeed: pageSpeedAnalyzer,
      repository: leadRepository,
      source: "google_maps",
    },
    input
  );
  revalidatePath("/admin/leads");
  return { ok: true };
}

/** Server action: permanently delete a single lead. */
export async function deleteLeadAction(
  id: string
): Promise<LeadActionResult> {
  await leadRepository.delete(id);
  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Server action: create a draft quote pre-populated from a qualified lead.
 * Composes the CreateQuoteInput from the lead + catalog, persists the draft via
 * the quote create use case, then redirects to the composer to review it.
 */
export async function createQuoteFromLeadAction(
  leadId: string
): Promise<LeadActionResult> {
  const prepared = await createQuoteFromLead(
    { leadRepository, catalogRepository },
    leadId
  );
  if (!prepared.ok) return { ok: false, error: prepared.error };

  const result = await createQuote(
    { repository: quoteRepository },
    prepared.input
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${result.quote.id}/edit`);
}
