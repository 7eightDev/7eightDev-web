import { z } from "zod";

/**
 * Runtime schema for the Service Catalog domain model. Mirrors the
 * discriminated unions in catalog.types.ts and is the single source of truth
 * for validation at every boundary (DB reads, admin form input).
 */

const currencySchema = z.enum(["EUR", "USD"]);

const moneySchema = z.object({
  amountCents: z.int().nonnegative(),
  currency: currencySchema,
});

export const pricingModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed"), price: moneySchema }),
  z
    .object({ kind: z.literal("range"), from: moneySchema, to: moneySchema })
    .refine((p) => p.to.amountCents >= p.from.amountCents, {
      message: "range.to must be greater than or equal to range.from",
      path: ["to"],
    }),
  z.object({ kind: z.literal("on_request") }),
]);

export const billingModelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("one_time") }),
  z.object({
    kind: z.literal("recurring"),
    interval: z.enum(["monthly", "yearly"]),
  }),
]);

export const catalogItemSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a kebab-case slug"),
  tier: z.enum(["web_assets", "enterprise"]),
  title: z.string().min(1),
  description: z.string().min(1),
  pricing: pricingModelSchema,
  billing: billingModelSchema,
  defaultOptional: z.boolean(),
  sortOrder: z.int().nonnegative(),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
