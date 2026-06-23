import { z } from "zod";

/** Zod schemas: validation boundary for catalog admin input (prices in euros). */

export const catalogIdSchema = z
  .string()
  .min(1, "Id obbligatorio")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L'id dev'essere uno slug kebab-case");

const pricingInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    priceUnits: z.number().nonnegative("Il prezzo non può essere negativo"),
  }),
  z
    .object({
      kind: z.literal("range"),
      fromUnits: z.number().nonnegative("Il minimo non può essere negativo"),
      toUnits: z.number().nonnegative("Il massimo non può essere negativo"),
    })
    .refine((p) => p.toUnits >= p.fromUnits, {
      message: "Il massimo dev'essere ≥ del minimo",
      path: ["toUnits"],
    }),
  z.object({ kind: z.literal("on_request") }),
]);

const billingInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("one_time") }),
  z.object({
    kind: z.literal("recurring"),
    interval: z.enum(["monthly", "yearly"]),
  }),
  z.object({ kind: z.literal("on_demand") }),
]);

/** Form payload for creating/updating a catalog item (id passed separately). */
export const catalogItemInputSchema = z.object({
  tier: z.enum(["web_assets", "enterprise"]),
  title: z.string().min(2, "Titolo troppo corto"),
  description: z.string().min(2, "Descrizione troppo corta"),
  pricing: pricingInputSchema,
  billing: billingInputSchema,
  defaultOptional: z.boolean(),
  /** Optional: when omitted on create, the item is appended at the end. */
  sortOrder: z.number().int().nonnegative().optional(),
});

export type CatalogItemInput = z.infer<typeof catalogItemInputSchema>;
