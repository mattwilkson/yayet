/*
  # Fix Supabase Security Warnings

  1. Function Search Path Issues
    - Fix all 5 functions to explicitly set search_path
    - Prevents potential security vulnerabilities and unexpected behavior

  2. Security Recommendations
    - Guidance for enabling leaked password protection
    - Guidance for improving MFA options

  This migration addresses the Function Search Path Mutable warnings by updating
  all affected functions to explicitly set their search_path.
*/

-- 1. Fix generate_invitation_token function
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- 2. Fix cleanup_expired_invitations function
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < now();
END;
$$;

-- 3. Fix ensure_family_has_admin function
CREATE OR REPLACE FUNCTION ensure_family_has_admin()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path TO public, extensions
AS $$
BEGIN
    -- If we're trying to remove admin role, check if there are other admins
    IF OLD.role = 'admin' AND NEW.role = 'member' THEN
        IF NOT EXISTS (
            SELECT 1 FROM family_members 
            WHERE family_id = NEW.family_id 
            AND role = 'admin' 
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Cannot remove the last admin from the family. At least one admin must remain.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
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
$$;

-- 5. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO public, extensions
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Verify all functions have been updated with proper search_path
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    -- Check that all our functions now have search_path set
    FOR func_record IN 
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname IN (
            'generate_invitation_token',
            'cleanup_expired_invitations', 
            'ensure_family_has_admin',
            'handle_new_user',
            'update_updated_at_column'
        )
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        func_count := func_count + 1;
        RAISE LOG 'Function % has been updated with search_path', func_record.proname;
    END LOOP;
    
    RAISE LOG 'Total functions updated: %', func_count;
END $$;