/*
  # Fix infinite recursion in family_members RLS policy

  1. Problem
    - The "Allow admins to update family member roles" policy causes infinite recursion
    - It queries family_members table from within a policy applied to the same table
    - This creates a circular dependency during UPDATE operations

  2. Solution
    - Drop the problematic recursive policy
    - Create a new non-recursive policy that uses a more direct approach
    - Use a subquery that doesn't trigger the same policy recursion

  3. Changes
    - Remove recursive admin role update policy
    - Add new admin role update policy with safe logic
    - Ensure other policies remain intact
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Allow admins to update family member roles" ON family_members;

-- Create a new non-recursive policy for admin role updates
-- This policy allows updates if:
-- 1. The user is updating their own record, OR
-- 2. The user is an admin in the same family (checked via a safe subquery)
CREATE POLICY "Allow role updates by admins and self"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow users to update their own records
    user_id = auth.uid()
    OR
    -- Allow admins to update any family member in their family
    -- Use a direct query that doesn't trigger policy recursion
    EXISTS (
      SELECT 1 
      FROM family_members admin_check 
      WHERE admin_check.user_id = auth.uid() 
        AND admin_check.family_id = family_members.family_id 
        AND admin_check.role = 'admin'
        -- Add explicit filter to avoid policy recursion
        AND admin_check.id != family_members.id
    )
  )
  WITH CHECK (
    -- Same logic for the WITH CHECK clause
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 
      FROM family_members admin_check 
      WHERE admin_check.user_id = auth.uid() 
        AND admin_check.family_id = family_members.family_id 
        AND admin_check.role = 'admin'
        AND admin_check.id != family_members.id
    )
  );