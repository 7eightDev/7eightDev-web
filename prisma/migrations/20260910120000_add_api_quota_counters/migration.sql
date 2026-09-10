-- CreateTable
CREATE TABLE "api_quota_counters" (
    "bucket" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_quota_counters_pkey" PRIMARY KEY ("bucket","date")
);
