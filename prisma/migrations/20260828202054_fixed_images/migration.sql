/*
  Warnings:

  - You are about to drop the column `imageURL` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "imageURL" TEXT;
