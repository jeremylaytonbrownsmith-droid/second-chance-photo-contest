-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ENTRY_FEE', 'VOTE_PURCHASE', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProcessorName" AS ENUM ('MOCK', 'STRIPE', 'BBMS');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('FREE_VOTE', 'ENTRY_EMAIL');

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "entryFeeCents" INTEGER NOT NULL DEFAULT 1000,
    "votePriceCents" INTEGER NOT NULL DEFAULT 100,
    "votePackagesJson" JSONB NOT NULL DEFAULT '[{"votes":5},{"votes":10},{"votes":25},{"votes":50},{"votes":100}]',
    "goalCents" INTEGER NOT NULL DEFAULT 5000000,
    "freeVoteEnabled" BOOLEAN NOT NULL DEFAULT true,
    "roundsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "roundsConfigJson" JSONB,
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prizeText" TEXT,
    "prizeImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "petName" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "disqualifiedReason" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "voteQuantity" INTEGER,
    "processor" "PaymentProcessorName" NOT NULL,
    "processorRef" TEXT,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT NOT NULL,
    "donorAddress" TEXT,
    "donorCity" TEXT,
    "donorState" TEXT,
    "donorZip" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_vote_logs" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "votedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_vote_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MODERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_flags" (
    "id" TEXT NOT NULL,
    "entryId" TEXT,
    "transactionId" TEXT,
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entries_contestId_status_idx" ON "entries"("contestId", "status");

-- CreateIndex
CREATE INDEX "entries_contestId_voteCount_idx" ON "entries"("contestId", "voteCount");

-- CreateIndex
CREATE UNIQUE INDEX "entries_contestId_slug_key" ON "entries"("contestId", "slug");

-- CreateIndex
CREATE INDEX "transactions_contestId_status_idx" ON "transactions"("contestId", "status");

-- CreateIndex
CREATE INDEX "transactions_entryId_idx" ON "transactions"("entryId");

-- CreateIndex
CREATE INDEX "transactions_donorEmail_idx" ON "transactions"("donorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "free_vote_logs_contestId_entryId_email_votedOn_key" ON "free_vote_logs"("contestId", "entryId", "email", "votedOn");

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_idx" ON "email_verifications"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_vote_logs" ADD CONSTRAINT "free_vote_logs_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_vote_logs" ADD CONSTRAINT "free_vote_logs_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
