/*
  # Fix Family Creator Admin Role Assignment

  1. Problem Analysis
    - Family creators are getting separate "Family Admin" entries instead of their actual profile being made admin
    - The trigger function creates a generic admin entry rather than updating the user's existing family member record
    - This prevents proper admin functionality for the actual user profile

  2. Solution
    - Update the trigger function to find and update the user's existing family member record
    - If no existing record exists, create one with the user's actual details, not a generic "Family Admin"
    - Fix existing data where users have both a personal profile and a separate admin entry

  3. Data Cleanup
    - Remove duplicate "Family Admin" entries where the user already has a personal profile
    - Assign admin role to the user's actual family member profile
*/

-- First, let's fix existing data by removing duplicate admin entries and assigning admin to actual profiles

-- Step 1: For families where the admin_user_id has both a personal profile AND a "Family Admin" entry,
-- assign admin role to their personal profile and remove the generic "Family Admin" entry
DO $$
DECLARE
    family_record RECORD;
    personal_member_id UUID;
    admin_member_id UUID;
BEGIN
    FOR family_record IN 
        SELECT f.id as family_id, f.admin_user_id
        FROM families f
    LOOP
        -- Find the user's personal family member record (not "Family Admin")
        SELECT id INTO personal_member_id
        FROM family_members 
        WHERE family_id = family_record.family_id 
        AND user_id = family_record.admin_user_id 
        AND relationship != 'Family Admin'
        LIMIT 1;
        
        -- Find any "Family Admin" record for this user
        SELECT id INTO admin_member_id
        FROM family_members 
        WHERE family_id = family_record.family_id 
        AND user_id = family_record.admin_user_id 
        AND relationship = 'Family Admin'
        LIMIT 1;
        
        IF personal_member_id IS NOT NULL THEN
            -- Update the personal profile to be admin
            UPDATE family_members 
            SET role = 'admin' 
            WHERE id = personal_member_id;
            
            -- Remove the duplicate "Family Admin" entry if it exists
            IF admin_member_id IS NOT NULL THEN
                DELETE FROM family_members WHERE id = admin_member_id;
            END IF;
            
            RAISE LOG 'Fixed admin assignment for family % - made personal profile admin and removed duplicate', family_record.family_id;
        ELSIF admin_member_id IS NOT NULL THEN
            -- Only "Family Admin" entry exists, keep it but make it admin
            UPDATE family_members 
            SET role = 'admin' 
            WHERE id = admin_member_id;
            
            RAISE LOG 'Updated existing Family Admin entry for family %', family_record.family_id;
        END IF;
    END LOOP;
END $$;

-- Step 2: Update the trigger function to handle admin assignment correctly
CREATE OR REPLACE FUNCTION ensure_family_creator_is_admin()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    existing_member_id UUID;
    user_email TEXT;
BEGIN
    -- Get the user's email for naming
    SELECT email INTO user_email FROM users WHERE id = NEW.admin_user_id;
    
    -- Check if the admin user already has ANY family_member record in this family
    SELECT id INTO existing_member_id
    FROM family_members 
    WHERE family_id = NEW.id 
    AND user_id = NEW.admin_user_id
    LIMIT 1;
    
    IF existing_member_id IS NOT NULL THEN
        -- User already has a family member record, just make them admin
        UPDATE family_members 
        SET role = 'admin' 
        WHERE id = existing_member_id;
        
        RAISE LOG 'Updated existing family member % to admin role', existing_member_id;
    ELSE
        -- No existing record, create a new one with a reasonable default name
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
            COALESCE(SPLIT_PART(user_email, '@', 1), 'Family Creator'),
            'Parent', -- More appropriate default than "Family Admin"
            'immediate_family',
            'admin',
            '#DC2626'
        );
        
        RAISE LOG 'Created new admin family member for user %', NEW.admin_user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 3: Ensure all current family creators have admin role
UPDATE family_members 
SET role = 'admin' 
WHERE user_id IN (
    SELECT admin_user_id FROM families WHERE id = family_members.family_id
)
AND role != 'admin';

-- Step 4: Verify the fix
DO $$
DECLARE
    family_record RECORD;
    admin_count INTEGER;
    total_families INTEGER;
    families_fixed INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO total_families FROM families;
    
    FOR family_record IN SELECT id, admin_user_id FROM families LOOP
        SELECT COUNT(*) INTO admin_count
        FROM family_members 
        WHERE family_id = family_record.id 
        AND user_id = family_record.admin_user_id 
        AND role = 'admin';
        
        IF admin_count > 0 THEN
            families_fixed := families_fixed + 1;
        END IF;
    END LOOP;
    
    RAISE LOG 'Admin role verification: % out of % families have proper admin assignments', families_fixed, total_families;
    
    IF families_fixed = total_families THEN
        RAISE LOG 'SUCCESS: All family creators now have admin roles assigned to their profiles';
    ELSE
        RAISE LOG 'WARNING: % families still need admin role assignments', (total_families - families_fixed);
    END IF;
END $$;