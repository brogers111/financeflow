-- First, get your user ID (you'll need to replace YOUR_EMAIL with your actual email)
-- We'll store it in a variable
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Get the first user's ID (or you can specify by email)
  SELECT id INTO default_user_id FROM "User" LIMIT 1;
  
  -- Add the userId column as nullable first
  ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
  
  -- Set all existing categories to belong to the default user
  UPDATE "Category" SET "userId" = default_user_id;
  
  -- Now make it required
  ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
  
  -- Add the foreign key constraint
  ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  
  -- Drop the old unique constraint on name
  ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
  
  -- Add the new unique constraint on name + userId
  ALTER TABLE "Category" ADD CONSTRAINT "Category_name_userId_key" UNIQUE ("name", "userId");
END $$;