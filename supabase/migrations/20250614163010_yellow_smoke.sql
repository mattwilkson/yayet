/*
  # Fix User Profile Creation Issues

  1. Problem Analysis
    - Users are being created in auth.users but not in public.users table
    - The trigger function may not be working properly
    - RLS policies might be preventing proper access

  2. Solution
    - Fix the trigger function to handle edge cases
    - Ensure proper foreign key relationships
    - Add better error handling
    - Create missing user profiles for existing auth users

  3. Security
    - Maintain RLS while fixing functionality
    - Ensure users can access their own profiles
*/

-- First, let's fix the foreign key constraint on families table
-- The admin_user_id should reference auth.users, not public.users
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_admin_user_id_fkey;
ALTER TABLE families ADD CONSTRAINT families_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert user profile with proper error handling
    INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        'immediate_family',
        NULL,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user profiles for any existing auth users that don't have profiles
INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'immediate_family',
    NULL,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS policies are working correctly
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create simple, working policies
CREATE POLICY "users_select_own" ON users
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

-- Ensure families table policies work with the corrected foreign key
DROP POLICY IF EXISTS "families_select_by_admin" ON families;
DROP POLICY IF EXISTS "families_insert_by_admin" ON families;
DROP POLICY IF EXISTS "families_update_by_admin" ON families;

CREATE POLICY "families_select_by_admin" ON families
    FOR SELECT 
    TO authenticated
    USING (admin_user_id = auth.uid());

CREATE POLICY "families_insert_by_admin" ON families
    FOR INSERT 
    TO authenticated
    WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "families_update_by_admin" ON families
    FOR UPDATE 
    TO authenticated
    USING (admin_user_id = auth.uid());