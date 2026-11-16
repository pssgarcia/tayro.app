-- Migration ADITIVA (D-24, fatia do throttle). Escrita à mão: `prisma migrate dev`
-- está inutilizável localmente (drift no branch de dev do Neon, ver CLAUDE.md).

-- CreateTable
CREATE TABLE "throttle_hits" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "throttle_hits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "throttle_hits_expiresAt_idx" ON "throttle_hits"("expiresAt");
