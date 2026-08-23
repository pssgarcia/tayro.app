-- CreateEnum
CREATE TYPE "IgImageKind" AS ENUM ('PROFILE', 'POST');

-- CreateTable
CREATE TABLE "ig_images" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "kind" "IgImageKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ig_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ig_images_influencerId_idx" ON "ig_images"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "ig_images_influencerId_kind_position_key" ON "ig_images"("influencerId", "kind", "position");

-- AddForeignKey
ALTER TABLE "ig_images" ADD CONSTRAINT "ig_images_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
