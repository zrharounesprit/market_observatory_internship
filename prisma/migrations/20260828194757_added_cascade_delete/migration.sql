/*
  Warnings:

  - You are about to drop the column `imageURL` on the `Listing` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PriceHistory" DROP CONSTRAINT "PriceHistory_listingId_fkey";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "imageURL",
ADD COLUMN     "imageUrl" TEXT;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
