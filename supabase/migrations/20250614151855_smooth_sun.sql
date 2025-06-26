/*
  # Fix Fundamental Authentication Flow Issues

  1. Problem Analysis
    - RLS policies on users table are too restrictive
    - Circular dependencies in policy definitions
    - User profile creation/fetching is failing
    - Application gets stuck in loading state

  2. Solution
    - Simplify RLS policies to bare minimum
    - Ensure trigger function works properly
    - Fix policy definitions to avoid circular references
    - Allow proper user profile access

  3. Security
    - Users can read/write their own profile
    - Family-based access will be handled at application level
    - Maintain security while fixing functionality
*/

-- First, let's check if the trigger function exists and works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'immediate_family')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Create the simplest possible policies that will actually work
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

-- Ensure the policies are enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- For debugging: Let's also ensure the families table policies are correct
DROP POLICY IF EXISTS "Users can view own family" ON families;
DROP POLICY IF EXISTS "Admin can update own family" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;

CREATE POLICY "Users can view own family" ON families
    FOR SELECT 
    TO authenticated
    USING (
        admin_user_id = auth.uid() OR 
        id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admin can update own family" ON families
    FOR UPDATE 
    TO authenticated
    USING (admin_user_id = auth.uid());

CREATE POLICY "Users can create families" ON families
    FOR INSERT 
    TO authenticated
    WITH CHECK (admin_user_id = auth.uid());