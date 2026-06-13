import { z } from "zod";

/** Zod schemas: validation boundary for quote composition input. */

export const lineItemInputSchema = z.object({
  catalogRef: z.string().optional(),
  title: z.string().min(2, "Titolo troppo corto"),
  description: z.string(),
  /** Net unit price in whole euros as typed in the form. */
  priceUnits: z.number().nonnegative("Il prezzo non può essere negativo"),
  /** Number of units; defaults to 1 when omitted. */
  quantity: z.number().int().positive("La quantità deve essere ≥ 1").default(1),
  unit: z.string().optional(),
  optional: z.boolean(),
  type: z.literal(["one_time", "recurring"]),
  interval: z.literal(["monthly", "yearly"]).optional(),
});

/**
 * Discount as entered in the composer: a percentage in [0, 100] or a fixed
 * amount in whole euros. Converted to the domain `Discount` in the use case.
 */
export const discountInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("percent"), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal("fixed"), amountUnits: z.number().nonnegative() }),
]);

export const pairSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
});

export const createQuoteInputSchema = z.object({
  clientName: z.string().min(2, "Nome cliente obbligatorio"),
  clientCompany: z.string().optional(),
  clientEmail: z.email("Email non valida").optional().or(z.literal("")),
  project: z.string().min(2, "Nome progetto obbligatorio"),
  intro: z.string(),
  validUntil: z.iso.date("Data di scadenza non valida"),
  vatRate: z.number().min(0).max(1),
  lineItems: z.array(lineItemInputSchema).min(1, "Aggiungi almeno una voce"),
  /** phases: a = title, b = weeks */
  phases: z.array(pairSchema),
  /** terms: a = label, b = body */
  terms: z.array(pairSchema),
  /** techStack: a = label, b = technology */
  techStack: z.array(pairSchema),
  timelineNote: z.string().optional(),
  discount: discountInputSchema.optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;
export type LineItemInput = z.infer<typeof lineItemInputSchema>;
export type DiscountInput = z.infer<typeof discountInputSchema>;
