/*
  Warnings:

  - Added the required column `embedding` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "embedding" vector(384) NOT NULL;
