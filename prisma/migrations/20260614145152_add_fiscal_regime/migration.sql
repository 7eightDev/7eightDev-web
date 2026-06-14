-- CreateEnum
CREATE TYPE "FiscalRegime" AS ENUM ('vat', 'occasional');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "fiscalRegime" "FiscalRegime" NOT NULL DEFAULT 'vat';
