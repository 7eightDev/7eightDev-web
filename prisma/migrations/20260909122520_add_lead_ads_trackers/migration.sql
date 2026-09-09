-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "adsTrackers" TEXT[] DEFAULT ARRAY[]::TEXT[];
