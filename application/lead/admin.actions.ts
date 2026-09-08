"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startRunLeadJob } from "@/application/lead/start-run-lead-job";
import { rerunLeadGenerationJob } from "@/application/lead/rerun-lead-generation-job";
import { createQuoteFromLead } from "@/application/lead/create-quote-from-lead";
import { createQuote } from "@/application/quote/create-quote";
import {
  startLeadGenerationSchema,
  leadIdSchema,
  jobIdSchema,
} from "@/application/lead/lead.schemas";
import {
  catalogRepository,
  copyrightDetector,
  leadDiscovery,
  leadRepository,
  pageSpeedAnalyzer,
  quoteRepository,
  leadGenerationRateLimiter,
  techStackDetector,
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
      techStack: techStackDetector,
      copyright: copyrightDetector,
      source: "google_maps",
    },
    parsed.data
  );
  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Server action: re-run an existing search reusing the same job, so the
 * sidebar keeps a single card per search. No-op if the job is still running.
 */
export async function rerunLeadGenerationAction(
  jobId: string
): Promise<LeadActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  if (!leadGenerationRateLimiter.allow("lead-gen")) {
    return {
      ok: false,
      error: "Troppe richieste. Riprova tra qualche secondo.",
    };
  }

  const result = await rerunLeadGenerationJob(
    {
      discovery: leadDiscovery,
      pageSpeed: pageSpeedAnalyzer,
      repository: leadRepository,
      techStack: techStackDetector,
      copyright: copyrightDetector,
      source: "google_maps",
    },
    parsed.data
  );
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}

/** Server action: toggle the star (pin) on a recent search card. */
export async function toggleJobFavoriteAction(
  jobId: string
): Promise<LeadActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const job = await leadRepository.findJobById(parsed.data);
  if (!job) {
    return { ok: false, error: "Ricerca non trovata." };
  }

  await leadRepository.setJobFavorite(parsed.data, !(job.favorite ?? false));
  revalidatePath("/admin/leads");
  return { ok: true };
}

/** Server action: permanently delete a recent search job. Its leads keep the
 * association cleared (SetNull) and stay in the list. */
export async function deleteJobAction(
  jobId: string
): Promise<LeadActionResult> {
  const parsed = jobIdSchema.safeParse(jobId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await leadRepository.deleteJob(parsed.data);
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
 * Server action: fetch a lead with all its PageSpeed analyses, for the
 * slide-over detail Sheet. Returns plain serializable data (no revalidate).
 */
export async function getLeadDetailAction(
  leadId: string
): Promise<
  | {
      readonly ok: true;
      readonly lead: Awaited<ReturnType<typeof leadRepository.findById>>;
      readonly analyses: Awaited<
        ReturnType<typeof leadRepository.findAnalysesByLeadId>
      >;
    }
  | { readonly ok: false; readonly error: string }
> {
  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const lead = await leadRepository.findById(parsed.data);
  if (!lead) {
    return { ok: false, error: "Lead non trovato." };
  }

  const analyses = await leadRepository.findAnalysesByLeadId(parsed.data);

  return { ok: true, lead, analyses };
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
