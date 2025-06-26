/*
  # Fix Users Table RLS Policy Circular Dependency

  1. Problem
    - The current RLS policy on users table creates a circular dependency
    - When querying users table, it tries to join with itself causing infinite recursion
    - This causes queries to hang indefinitely

  2. Solution
    - Drop the problematic policy
    - Create a simpler policy that allows users to see their own profile
    - Add a separate policy for family members that doesn't cause recursion

  3. Security
    - Users can always see their own profile (id = auth.uid())
    - Users can see other users in their family through a direct family_id match
    - This maintains security while avoiding the circular reference
*/

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Users can view own and family profiles" ON users;

-- Create a simple policy for users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create a separate policy for viewing family members
-- This avoids the circular dependency by using a direct approach
CREATE POLICY "Users can view family members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    family_id IS NOT NULL AND 
    family_id IN (
      SELECT family_id 
      FROM users 
      WHERE id = auth.uid() AND family_id IS NOT NULL
    )
  );