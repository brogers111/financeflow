-- Add userId to Paycheck
ALTER TABLE "Paycheck" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Assign existing paychecks to first user
UPDATE "Paycheck" 
SET "userId" = (SELECT id FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Make userId required
ALTER TABLE "Paycheck" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "Paycheck" 
ADD CONSTRAINT "Paycheck_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS "Paycheck_userId_date_idx" ON "Paycheck"("userId", "date");

-- Add userId to HealthMetric
ALTER TABLE "HealthMetric" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Assign existing health metrics to first user
UPDATE "HealthMetric" 
SET "userId" = (SELECT id FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Make userId required
ALTER TABLE "HealthMetric" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "HealthMetric" 
ADD CONSTRAINT "HealthMetric_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update index to include userId
DROP INDEX IF EXISTS "HealthMetric_date_type_idx";
CREATE INDEX "HealthMetric_userId_date_type_idx" ON "HealthMetric"("userId", "date", "type");