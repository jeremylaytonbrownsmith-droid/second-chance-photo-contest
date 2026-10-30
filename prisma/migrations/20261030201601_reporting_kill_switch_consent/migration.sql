-- AlterEnum
ALTER TYPE "EntryStatus" ADD VALUE 'REPORTED';

-- AlterTable
ALTER TABLE "contests" ADD COLUMN     "galleryPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "galleryPausedReason" TEXT;

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "consentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "moderationFlags" TEXT;

-- CreateTable
CREATE TABLE "entry_reports" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entry_reports_entryId_idx" ON "entry_reports"("entryId");

-- AddForeignKey
ALTER TABLE "entry_reports" ADD CONSTRAINT "entry_reports_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
