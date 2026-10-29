-- CreateEnum
CREATE TYPE "AnimalSpecies" AS ENUM ('DOG', 'CAT', 'OTHER');

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "rescueSource" TEXT,
ADD COLUMN     "species" "AnimalSpecies";

-- CreateIndex
CREATE INDEX "entries_contestId_status_species_idx" ON "entries"("contestId", "status", "species");
