-- AlterTable - First make userId nullable
ALTER TABLE "CategorizationPattern" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Set all existing patterns to the first user
UPDATE "CategorizationPattern" 
SET "userId" = (SELECT id FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Now make userId required and add the foreign key
ALTER TABLE "CategorizationPattern" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CategorizationPattern_userId_fkey'
  ) THEN
    ALTER TABLE "CategorizationPattern" 
    ADD CONSTRAINT "CategorizationPattern_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add updatedAt column with default
ALTER TABLE "CategorizationPattern" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index only if it doesn't exist (skip if already exists)
CREATE INDEX IF NOT EXISTS "CategorizationPattern_descriptionPattern_idx" 
ON "CategorizationPattern"("descriptionPattern");