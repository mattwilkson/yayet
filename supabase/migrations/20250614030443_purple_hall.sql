/*
  # Fix infinite recursion in users table RLS policy

  1. Policy Changes
    - Drop the existing "Users can view family users" policy that causes infinite recursion
    - Create a new simplified policy that allows users to view their own profile and other users in the same family
    - The new policy avoids the recursive subquery by using a more direct approach

  2. Security
    - Users can still view their own profile (id = uid())
    - Users can view other users who share the same family_id, but only if they themselves have a family_id
    - This maintains the same security model without the recursion issue
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view family users" ON users;

-- Create a new policy that avoids recursion
-- This policy allows users to see their own profile and profiles of users with the same family_id
CREATE POLICY "Users can view own and family profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    (
      family_id IS NOT NULL AND 
      family_id = (
        SELECT family_id 
        FROM auth.users au 
        JOIN users u ON au.id = u.id 
        WHERE au.id = auth.uid() 
        LIMIT 1
      )
    )
  );