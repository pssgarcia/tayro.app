-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('CASH', 'PRODUCT');

-- CreateEnum
CREATE TYPE "IgFetchStatus" AS ENUM ('OK', 'PENDING', 'FAILED');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "offerAmount" INTEGER,
ADD COLUMN     "offerDeadlineDays" INTEGER,
ADD COLUMN     "offerDescription" TEXT,
ADD COLUMN     "offerType" "OfferType";

-- AlterTable
ALTER TABLE "influencers" ADD COLUMN     "igEngagementRate" DOUBLE PRECISION,
ADD COLUMN     "igFetchStatus" "IgFetchStatus",
ADD COLUMN     "igFetchedAt" TIMESTAMP(3),
ADD COLUMN     "igRecentPosts" JSONB;

-- CreateTable
CREATE TABLE "partnership_results" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER,
    "couponsUsed" INTEGER,
    "note" TEXT,
    "visibleToCreator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnership_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partnership_results_applicationId_key" ON "partnership_results"("applicationId");

-- AddForeignKey
ALTER TABLE "partnership_results" ADD CONSTRAINT "partnership_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
