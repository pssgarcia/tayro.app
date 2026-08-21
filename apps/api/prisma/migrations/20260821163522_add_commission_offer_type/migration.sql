-- AlterEnum
ALTER TYPE "OfferType" ADD VALUE 'COMMISSION';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "offerCommissionPercent" DOUBLE PRECISION;
