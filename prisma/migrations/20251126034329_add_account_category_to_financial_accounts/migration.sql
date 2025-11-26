-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('PERSONAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "accountType" "AccountCategory" NOT NULL DEFAULT 'PERSONAL';
