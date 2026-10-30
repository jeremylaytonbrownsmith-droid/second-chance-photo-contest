-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('FEATURED', 'SUPPORTER');

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "shareApproved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'SUPPORTER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsors_contestId_tier_sortOrder_idx" ON "sponsors"("contestId", "tier", "sortOrder");

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
