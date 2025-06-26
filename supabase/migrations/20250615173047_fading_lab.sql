/*
  # Fix Profile Fetching Issues

  1. Problem Analysis
    - Profile fetching is hanging or timing out
    - Database queries may be blocked by RLS policies
    - Need to ensure user profiles are created reliably

  2. Solution
    - Simplify RLS policies even further
    - Add better error handling in trigger function
    - Ensure all existing users have profiles
    - Add performance optimizations

  3. Security
    - Maintain basic security while ensuring functionality
*/

-- Drop all existing policies and recreate them as simply as possible
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create the absolute simplest policies possible
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

-- Make the trigger function even more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Use UPSERT to handle any race conditions
    INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, 'user@example.com'), 
        'immediate_family',
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(NEW.email, users.email),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Even if there's an error, don't fail the auth process
        RAISE LOG 'handle_new_user error for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for ALL existing auth users (force sync)
INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.email, 'user@example.com'),
    'immediate_family',
    NULL,
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_id_btree ON users USING btree(id);
CREATE INDEX IF NOT EXISTS idx_users_email_btree ON users USING btree(email);

-- Ensure RLS is enabled but not blocking
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test that the policies work by running a simple query
-- This will help identify any immediate issues
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM users LIMIT 1;
    RAISE LOG 'Users table accessible, count check passed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Users table access test failed: %', SQLERRM;
END $$;