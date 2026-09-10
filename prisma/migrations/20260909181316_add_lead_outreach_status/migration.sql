-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('not_contacted', 'audit_sent', 'in_talks', 'closed_won', 'rejected');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "outreachNotes" TEXT,
ADD COLUMN     "outreachStatus" "OutreachStatus" NOT NULL DEFAULT 'not_contacted';
