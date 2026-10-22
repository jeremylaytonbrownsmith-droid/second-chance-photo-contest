-- CreateTable
CREATE TABLE "admin_passkeys" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "admin_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_passkeys_credentialId_key" ON "admin_passkeys"("credentialId");

-- AddForeignKey
ALTER TABLE "admin_passkeys" ADD CONSTRAINT "admin_passkeys_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
