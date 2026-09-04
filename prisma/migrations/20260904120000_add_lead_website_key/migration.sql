-- AlterTable: add websiteKey column
ALTER TABLE "leads" ADD COLUMN "websiteKey" TEXT;

-- Populate websiteKey from existing website values using the same normalization
-- as the application-level websiteKey() function:
--   strip protocol, strip www., lowercase, strip trailing slash
UPDATE "leads"
SET "websiteKey" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM("website"), '^https?://', ''),
    '^www\.', ''),
  '/$', '')
)
WHERE "website" IS NOT NULL AND TRIM("website") != '';

-- CreateIndex: unique constraint on websiteKey (nullable — multiple NULLs allowed)
CREATE UNIQUE INDEX "leads_websiteKey_key" ON "leads"("websiteKey");
