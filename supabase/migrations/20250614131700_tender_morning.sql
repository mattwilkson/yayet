-- Completely reset users table policies to the absolute minimum
DROP POLICY IF EXISTS "Users can view own record only" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Users can view own and family profiles" ON users;
DROP POLICY IF EXISTS "Users can view family users" ON users;

-- Create the most basic policy possible
CREATE POLICY "Allow users to read own record"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own record
CREATE POLICY "Allow users to update own record"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own record (for the trigger)
CREATE POLICY "Allow users to insert own record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);