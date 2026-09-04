-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "leads_jobId_idx" ON "leads"("jobId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "lead_generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
