/*
  # Fix Users Table RLS Policies

  1. Policy Changes
    - Drop all existing problematic policies on users table
    - Create simple, working policies that use auth.uid() correctly
    - Ensure users can only access their own records

  2. Security
    - Users can select their own record only
    - Users can insert their own record only  
    - Users can update their own record only
*/

-- Drop ALL existing policies on users table
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

-- Create simple, working policies
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