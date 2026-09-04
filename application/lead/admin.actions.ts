"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startRunLeadJob } from "@/application/lead/start-run-lead-job";
import { createQuoteFromLead } from "@/application/lead/create-quote-from-lead";
import { createQuote } from "@/application/quote/create-quote";
import {
  startLeadGenerationSchema,
  leadIdSchema,
} from "@/application/lead/lead.schemas";
import {
  catalogRepository,
  leadDiscovery,
  leadRepository,
  pageSpeedAnalyzer,
  quoteRepository,
  leadGenerationRateLimiter,
} from "@/infrastructure/container";

export interface LeadActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

/** Server action: kick off a lead generation search (query + location + quantity). */
export async function startLeadGenerationAction(
  rawInput: unknown
): Promise<LeadActionResult> {
  const parsed = startLeadGenerationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  if (!leadGenerationRateLimiter.allow("lead-gen")) {
    return {
      ok: false,
      error: "Troppe richieste. Riprova tra qualche secondo.",
    };
  }

  await startRunLeadJob(
    {
      discovery: leadDiscovery,
      pageSpeed: pageSpeedAnalyzer,
      repository: leadRepository,
      source: "google_maps",
    },
    parsed.data
  );
  revalidatePath("/admin/leads");
  return { ok: true };
}

/** Server action: permanently delete a single lead. */
export async function deleteLeadAction(
  id: string
): Promise<LeadActionResult> {
  const parsed = leadIdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await leadRepository.delete(parsed.data);
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
  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const prepared = await createQuoteFromLead(
    { leadRepository, catalogRepository },
    parsed.data
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
