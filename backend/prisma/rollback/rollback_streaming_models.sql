-- Rollback script for streaming models migration
-- Use this script to remove all streaming-related tables and fields

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS "Comment" CASCADE;
DROP TABLE IF EXISTS "StreamProduct" CASCADE;
DROP TABLE IF EXISTS "Stream" CASCADE;
DROP TABLE IF EXISTS "_UserWishlist" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;

-- Remove added columns from User table
ALTER TABLE "User" 
DROP COLUMN IF EXISTS "username",
DROP COLUMN IF EXISTS "isAdmin",
DROP COLUMN IF EXISTS "streamKey";

-- Drop indexes that were added
DROP INDEX IF EXISTS "User_username_idx";
DROP INDEX IF EXISTS "User_streamKey_idx";