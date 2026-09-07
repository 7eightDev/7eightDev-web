-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];
