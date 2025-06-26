/*
  # Fix Authentication Flow - Complete Reset

  1. Problem Analysis
    - Authentication flow is getting stuck in loading states
    - Database policies may be causing circular dependencies
    - User profile creation is failing

  2. Solution
    - Completely reset and simplify all authentication-related policies
    - Ensure trigger function works reliably
    - Fix any foreign key issues
    - Create a bulletproof authentication flow

  3. Security
    - Maintain security while ensuring functionality
    - Simple, working policies that avoid circular dependencies
*/

-- Drop all existing policies to start completely fresh
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "families_select_by_admin" ON families;
DROP POLICY IF EXISTS "families_insert_by_admin" ON families;
DROP POLICY IF EXISTS "families_update_by_admin" ON families;

-- Ensure the trigger function is bulletproof
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert user profile with comprehensive error handling
    INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''), 
        'immediate_family',
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the simplest possible working policies for users
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

-- Create simple policies for families
CREATE POLICY "families_select_by_admin"
  ON families
  FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "families_insert_by_admin"
  ON families
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "families_update_by_admin"
  ON families
  FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid());

-- Ensure all tables have RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create user profiles for any existing auth users that don't have profiles
INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.email, ''),
    'immediate_family',
    NULL,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_families_admin_user_id ON families(admin_user_id);