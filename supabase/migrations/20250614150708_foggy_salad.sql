/*
  # Fix Users Table RLS Policies - Final Solution

  1. Problem Analysis
    - Current RLS policies on users table are causing infinite loops/timeouts
    - The policies are creating circular dependencies when querying user profiles
    - This causes the auth system to hang indefinitely

  2. Solution
    - Completely reset all users table policies
    - Create minimal, working policies that avoid any circular references
    - Use direct auth.uid() comparisons without subqueries
    - Allow users to view other family members through a separate, simpler approach

  3. Security Maintained
    - Users can only see their own profile directly
    - Family member access is handled through application logic rather than complex RLS
    - This maintains security while ensuring the app actually works
*/

-- Drop ALL existing policies on users table to start completely fresh
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Allow users to read own record" ON users;
DROP POLICY IF EXISTS "Allow users to update own record" ON users;
DROP POLICY IF EXISTS "Allow users to insert own record" ON users;
DROP POLICY IF EXISTS "Users can view own record only" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Users can view own and family profiles" ON users;
DROP POLICY IF EXISTS "Users can view family users" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;

-- Create the absolute simplest policies that will work
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Note: For viewing other family members, the application will handle this
-- by making separate queries rather than trying to do complex RLS policies
-- that cause circular dependencies