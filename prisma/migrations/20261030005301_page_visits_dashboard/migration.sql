-- CreateTable
CREATE TABLE "page_visits" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_visits_day_idx" ON "page_visits"("day");

-- CreateIndex
CREATE UNIQUE INDEX "page_visits_day_visitorId_key" ON "page_visits"("day", "visitorId");
