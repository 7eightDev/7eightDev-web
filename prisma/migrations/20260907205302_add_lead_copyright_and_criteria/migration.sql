-- AlterTable
ALTER TABLE "lead_generation_jobs" ADD COLUMN     "copyright" TEXT,
ADD COLUMN     "techStack" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "copyright" TEXT;
