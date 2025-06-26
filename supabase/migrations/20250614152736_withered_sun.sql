/*
  # Fix Circular Dependency in RLS Policies

  The issue is that the families table policy references the users table,
  and when we try to fetch a user profile that has a family_id, it creates
  a circular dependency that hangs the query.

  Solution: Simplify all policies to avoid any cross-table references
  that could cause circular dependencies.
*/

-- Drop ALL existing policies on families table that cause circular dependencies
DROP POLICY IF EXISTS "Users can view own family" ON families;
DROP POLICY IF EXISTS "Admin can update own family" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;

-- Create simple policies for families table that don't reference users table
CREATE POLICY "families_select_by_admin"
  ON families
  FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "families_update_by_admin"
  ON families
  FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "families_insert_by_admin"
  ON families
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Ensure users table policies are still simple
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

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

-- Fix the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'immediate_family')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();