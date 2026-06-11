-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "client" JSONB NOT NULL,
    "project" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "lineItems" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "acceptance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");
