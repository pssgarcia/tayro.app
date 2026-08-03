-- AlterTable
ALTER TABLE "users" ADD COLUMN "claimTokenHash" TEXT,
ADD COLUMN "claimTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_claimTokenHash_key" ON "users"("claimTokenHash");
