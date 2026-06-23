-- Add the on-demand billing variant ("interventi a chiamata"). Items billed
-- this way are composed into a quote as on_demand line items: priced as a
-- starting base but never part of any total.
ALTER TYPE "BillingKind" ADD VALUE IF NOT EXISTS 'on_demand';

-- Recompute the billing variant CHECK so an interval is required iff the item
-- is recurring; one_time and on_demand both must carry a NULL interval.
-- Written as "<> 'recurring'" on purpose: it must not reference the freshly
-- added enum value, which Postgres forbids using in the same transaction as
-- the ALTER TYPE ... ADD VALUE above.
ALTER TABLE "catalog_items"
  DROP CONSTRAINT "catalog_items_billing_variant_check";

ALTER TABLE "catalog_items"
  ADD CONSTRAINT "catalog_items_billing_variant_check" CHECK (
    (
      "billingKind" = 'recurring' AND "billingInterval" IS NOT NULL
    )
    OR (
      "billingKind" <> 'recurring' AND "billingInterval" IS NULL
    )
  );
