-- Step 1: Delete duplicate categorization patterns, keeping only the most recently used one per (userId, descriptionPattern) combination
DELETE FROM "CategorizationPattern" cp1
WHERE cp1."id" NOT IN (
  SELECT DISTINCT ON ("userId", "descriptionPattern") "id"
  FROM "CategorizationPattern"
  ORDER BY "userId", "descriptionPattern", "lastUsed" DESC, "timesUsed" DESC
);

-- Step 2: Drop the old unique constraint on descriptionPattern
DROP INDEX IF EXISTS "CategorizationPattern_descriptionPattern_key";

-- Step 3: Create the new composite unique constraint on (userId, descriptionPattern)
CREATE UNIQUE INDEX "CategorizationPattern_userId_descriptionPattern_key" ON "CategorizationPattern"("userId", "descriptionPattern");
