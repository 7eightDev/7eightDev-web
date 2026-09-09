import { z } from "zod";

/** Zod schemas: validation boundary for lead generation input. */

export const startLeadGenerationSchema = z.object({
  query: z
    .string()
    .min(1, "La ricerca non può essere vuota")
    .max(200, "La ricerca non può superare 200 caratteri"),
  location: z
    .string()
    .min(1, "La location non può essere vuota")
    .max(200, "La location non può superare 200 caratteri"),
  quantity: z
    .number()
    .int()
    .min(1, "La quantità minima è 1")
    .max(100, "La quantità massima è 100")
    .optional(),
  techStack: z
    .string()
    .trim()
    .max(100, "Il tech/stack non può superare 100 caratteri")
    .optional()
    .transform((value) => (value ? value : undefined)),
  copyright: z
    .string()
    .trim()
    .max(200, "Il copyright non può superare 200 caratteri")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type StartLeadGenerationInput = z.infer<
  typeof startLeadGenerationSchema
>;

export const leadIdSchema = z.string().uuid("Id lead non valido");

export const leadOutreachStatusSchema = z.enum([
  "not_contacted",
  "audit_sent",
  "in_talks",
  "closed_won",
  "rejected",
]);

export const leadOutreachNotesSchema = z
  .string()
  .trim()
  .max(2000, "Le note non possono superare 2000 caratteri")
  .optional()
  .transform((value) => (value ? value : undefined));

export const updateLeadOutreachSchema = z.object({
  leadId: leadIdSchema,
  outreachStatus: leadOutreachStatusSchema,
  notes: leadOutreachNotesSchema,
});

export const jobIdSchema = z.string().uuid("Id job non valido");

export const websiteUrlSchema = z
  .string()
  .max(2048, "L'URL non può superare 2048 caratteri")
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        const url = new URL(val);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL del sito web non valido" }
  );
