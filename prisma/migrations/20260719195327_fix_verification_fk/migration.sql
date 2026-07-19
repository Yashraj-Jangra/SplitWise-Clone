-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_identifier_fkey";

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP NOT NULL;
