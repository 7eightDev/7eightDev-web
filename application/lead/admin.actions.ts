"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runLeadGenerationPipeline } from "@/application/lead/run-lead-generation-pipeline";
import {
  leadDiscovery,
  leadRepository,
  pageSpeedAnalyzer,
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
  const result = await runLeadGenerationPipeline(
    {
      discovery: leadDiscovery,
      pageSpeed: pageSpeedAnalyzer,
      repository: leadRepository,
    },
    input
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

/** Server action: permanently delete a single lead. */
export async function deleteLeadAction(
  id: string
): Promise<LeadActionResult> {
  await leadRepository.delete(id);
  revalidatePath("/admin/leads");
  return { ok: true };
}
