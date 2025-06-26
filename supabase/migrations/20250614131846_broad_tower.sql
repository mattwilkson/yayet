/*
  # Reset Users Table Policies - Ultra Simple
  
  This migration completely resets the users table policies to the absolute minimum
  required for the app to function. We're removing all complex policies that might
  be causing circular dependencies or other issues.
*/

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Allow users to read own record" ON users;
DROP POLICY IF EXISTS "Allow users to update own record" ON users;
DROP POLICY IF EXISTS "Allow users to insert own record" ON users;
DROP POLICY IF EXISTS "Users can view own record only" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Users can view own and family profiles" ON users;
DROP POLICY IF EXISTS "Users can view family users" ON users;
DROP POLICY IF EXISTS "Allow users to read own record" ON users;
DROP POLICY IF EXISTS "Allow users to update own record" ON users;
DROP POLICY IF EXISTS "Allow users to insert own record" ON users;

-- Create the absolute minimum policies needed
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);