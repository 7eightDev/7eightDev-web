-- CreateEnum
CREATE TYPE "CatalogTier" AS ENUM ('web_assets', 'enterprise');

-- CreateEnum
CREATE TYPE "PricingKind" AS ENUM ('fixed', 'range', 'on_request');

-- CreateEnum
CREATE TYPE "BillingKind" AS ENUM ('one_time', 'recurring');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "tier" "CatalogTier" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricingKind" "PricingKind" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "priceCents" INTEGER,
    "fromCents" INTEGER,
    "toCents" INTEGER,
    "billingKind" "BillingKind" NOT NULL,
    "billingInterval" "BillingInterval",
    "defaultOptional" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_items_tier_idx" ON "catalog_items"("tier");

-- Enforce the pricing discriminated union at the database level: the variant
-- columns must be present/absent according to "pricingKind", and amounts must
-- be non-negative with a coherent range.
ALTER TABLE "catalog_items"
  ADD CONSTRAINT "catalog_items_pricing_variant_check" CHECK (
    (
      "pricingKind" = 'fixed'
      AND "priceCents" IS NOT NULL AND "priceCents" >= 0
      AND "fromCents" IS NULL AND "toCents" IS NULL
    )
    OR (
      "pricingKind" = 'range'
      AND "fromCents" IS NOT NULL AND "fromCents" >= 0
      AND "toCents" IS NOT NULL AND "toCents" >= "fromCents"
      AND "priceCents" IS NULL
    )
    OR (
      "pricingKind" = 'on_request'
      AND "priceCents" IS NULL AND "fromCents" IS NULL AND "toCents" IS NULL
    )
  );

-- Enforce the billing discriminated union: an interval is required iff the
-- item is recurring.
ALTER TABLE "catalog_items"
  ADD CONSTRAINT "catalog_items_billing_variant_check" CHECK (
    (
      "billingKind" = 'recurring' AND "billingInterval" IS NOT NULL
    )
    OR (
      "billingKind" = 'one_time' AND "billingInterval" IS NULL
    )
  );
