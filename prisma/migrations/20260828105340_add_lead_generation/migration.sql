-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('google_maps', 'outscraper', 'serpapi');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'analyzed', 'qualified', 'discarded');

-- CreateEnum
CREATE TYPE "LeadGenerationJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "category" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_analyses" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "performanceScore" DOUBLE PRECISION,
    "lcp" DOUBLE PRECISION,
    "fcp" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION,
    "tbt" DOUBLE PRECISION,
    "analyzedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_generation_jobs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "LeadGenerationJobStatus" NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "analyzed" INTEGER NOT NULL DEFAULT 0,
    "qualified" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_analyses_leadId_idx" ON "lead_analyses"("leadId");

-- AddForeignKey
ALTER TABLE "lead_analyses" ADD CONSTRAINT "lead_analyses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
