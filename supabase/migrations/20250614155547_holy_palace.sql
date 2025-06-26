/*
  # Fix Authentication Flow Issues

  1. Problem
    - Users getting stuck on profile loading screen
    - Database queries timing out or failing
    - Complex RLS policies causing issues

  2. Solution
    - Simplify all database policies
    - Make user profile creation more robust
    - Add better fallback handling

  3. Changes
    - Ensure trigger function works properly
    - Simplify RLS policies to avoid any circular dependencies
    - Make the system more fault-tolerant
*/

-- Ensure the trigger function is working properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert with ON CONFLICT to handle race conditions
    INSERT INTO public.users (id, email, role, family_id, created_at, updated_at)
    VALUES (
        new.id, 
        new.email, 
        'immediate_family',
        null,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure all tables have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_families_admin_user_id ON families(admin_user_id);

-- Verify RLS policies are simple and working
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

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

-- Ensure families policies are simple
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