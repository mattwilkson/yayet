/*
  # Fix infinite recursion in family_members RLS policy

  1. Problem
    - The "Allow role updates by admins and self" policy on family_members table causes infinite recursion
    - The policy's subquery to check admin status triggers the same RLS policy, creating a circular dependency

  2. Solution
    - Create a SECURITY DEFINER function to check admin status without triggering RLS
    - Replace the problematic policy with one that uses this function
    - This breaks the recursion by allowing the admin check to bypass RLS

  3. Changes
    - Add `is_family_admin` function with SECURITY DEFINER privileges
    - Drop and recreate the problematic UPDATE policy
    - Maintain the same access control logic but without recursion
*/

-- Create a SECURITY DEFINER function to check if a user is a family admin
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_family_admin(check_user_id uuid, check_family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_members.user_id = check_user_id
      AND family_members.family_id = check_family_id
      AND family_members.role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users (needed for RLS policies)
GRANT EXECUTE ON FUNCTION public.is_family_admin(uuid, uuid) TO authenticated;

-- Revoke public execute permission for security
REVOKE EXECUTE ON FUNCTION public.is_family_admin(uuid, uuid) FROM public;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Allow role updates by admins and self" ON public.family_members;

-- Create a new policy that uses the SECURITY DEFINER function
-- This prevents recursion while maintaining the same access control logic
CREATE POLICY "Allow role updates by admins and self"
ON public.family_members
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid()) OR 
  public.is_family_admin(auth.uid(), family_id)
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  public.is_family_admin(auth.uid(), family_id)
);