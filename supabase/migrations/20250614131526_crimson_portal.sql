-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Users can view own and family profiles" ON users;
DROP POLICY IF EXISTS "Users can view family users" ON users;

-- Create the simplest possible policy - users can only see their own record
CREATE POLICY "Users can view own record only"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- For family member viewing, we'll handle this in the application layer
-- by making separate queries rather than trying to do it all in one RLS policy