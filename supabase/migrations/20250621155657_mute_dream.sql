/*
  # Fix Family Creator Admin Role Assignment

  1. Problem Analysis
    - Family creators are not automatically assigned admin role
    - This prevents them from managing their own families
    - The onboarding process creates family_members with default 'member' role

  2. Solution
    - Update the onboarding process to assign 'admin' role to family creators
    - Fix existing family creators who should be admins
    - Ensure proper admin assignment in family creation flow

  3. Data Fix
    - Update existing family creators to have admin role
    - Ensure all family admin_user_id users have admin role in family_members
*/

-- First, fix existing data: Set family creators as admins
-- This updates family_members where the user_id matches the admin_user_id in families table
UPDATE family_members 
SET role = 'admin' 
WHERE user_id IN (
    SELECT f.admin_user_id 
    FROM families f 
    WHERE f.id = family_members.family_id
    AND f.admin_user_id = family_members.user_id
);

-- Ensure every family has at least one admin
-- If a family has no admins, make the admin_user_id an admin
INSERT INTO family_members (family_id, user_id, name, relationship, category, role, color)
SELECT 
    f.id as family_id,
    f.admin_user_id as user_id,
    COALESCE(u.email, 'Family Admin') as name,
    'Family Admin' as relationship,
    'immediate_family' as category,
    'admin' as role,
    '#DC2626' as color
FROM families f
JOIN users u ON f.admin_user_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.family_id = f.id 
    AND fm.user_id = f.admin_user_id
)
ON CONFLICT DO NOTHING;

-- Update any existing family creator records to ensure they have admin role
UPDATE family_members 
SET role = 'admin' 
WHERE user_id IN (
    SELECT admin_user_id FROM families WHERE id = family_members.family_id
)
AND role != 'admin';

-- Create a function to ensure family creators get admin role during onboarding
CREATE OR REPLACE FUNCTION ensure_family_creator_is_admin()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- When a new family is created, ensure the admin_user_id gets admin role
    -- This will be called after family creation
    
    -- Check if the admin user already has a family_member record
    IF NOT EXISTS (
        SELECT 1 FROM family_members 
        WHERE family_id = NEW.id 
        AND user_id = NEW.admin_user_id
    ) THEN
        -- Create family_member record for the family creator with admin role
        INSERT INTO family_members (
            family_id, 
            user_id, 
            name, 
            relationship, 
            category, 
            role, 
            color
        ) VALUES (
            NEW.id,
            NEW.admin_user_id,
            (SELECT COALESCE(email, 'Family Admin') FROM users WHERE id = NEW.admin_user_id),
            'Family Admin',
            'immediate_family',
            'admin',
            '#DC2626'
        );
    ELSE
        -- Update existing record to ensure admin role
        UPDATE family_members 
        SET role = 'admin' 
        WHERE family_id = NEW.id 
        AND user_id = NEW.admin_user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically assign admin role when family is created
DROP TRIGGER IF EXISTS ensure_family_creator_admin_trigger ON families;
CREATE TRIGGER ensure_family_creator_admin_trigger
    AFTER INSERT ON families
    FOR EACH ROW
    EXECUTE FUNCTION ensure_family_creator_is_admin();

-- Verify the fix by checking current admin assignments
DO $$
DECLARE
    family_record RECORD;
    admin_count INTEGER;
    total_families INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_families FROM families;
    
    admin_count := 0;
    FOR family_record IN SELECT id, admin_user_id FROM families LOOP
        IF EXISTS (
            SELECT 1 FROM family_members 
            WHERE family_id = family_record.id 
            AND user_id = family_record.admin_user_id 
            AND role = 'admin'
        ) THEN
            admin_count := admin_count + 1;
        END IF;
    END LOOP;
    
    RAISE LOG 'Admin role verification: % out of % families have proper admin assignments', admin_count, total_families;
    
    IF admin_count = total_families THEN
        RAISE LOG 'SUCCESS: All family creators now have admin roles';
    ELSE
        RAISE LOG 'WARNING: % families still missing admin role assignments', (total_families - admin_count);
    END IF;
END $$;