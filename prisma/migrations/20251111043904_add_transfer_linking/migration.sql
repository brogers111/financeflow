/*
  Warnings:

  - A unique constraint covering the columns `[linkedTransferId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "linkedTransferId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_linkedTransferId_key" ON "Transaction"("linkedTransferId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_linkedTransferId_fkey" FOREIGN KEY ("linkedTransferId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
