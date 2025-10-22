-- AlterTable
ALTER TABLE "User" ADD COLUMN     "location" TEXT,
ADD COLUMN     "publicProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialLinks" JSONB;
