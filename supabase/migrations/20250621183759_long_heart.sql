/*
  # Extend Family Members and Invitations System

  1. Schema Extensions
    - Ensure `role` column exists on family_members table with proper constraints
    - Add `invite_token` column to family_members table
    - Add `member_id` foreign key link from invitations to family_members
    - Add proper indexes for performance

  2. Data Integrity
    - Ensure existing data is properly migrated
    - Add constraints and validation
    - Maintain referential integrity

  3. Security
    - Update RLS policies if needed
    - Ensure proper access control for new columns
*/

-- 1. Extend family_members table

-- Add role column if it doesn't exist (it should already exist based on schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'role'
    ) THEN
        ALTER TABLE family_members ADD COLUMN role text NOT NULL DEFAULT 'member';
    END IF;
END $$;

-- Ensure role column has proper constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;
    
    -- Add the constraint
    ALTER TABLE family_members ADD CONSTRAINT family_members_role_check 
        CHECK (role IN ('member', 'admin'));
END $$;

-- Add invite_token column to family_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'invite_token'
    ) THEN
        ALTER TABLE family_members ADD COLUMN invite_token uuid;
    END IF;
END $$;

-- 2. Extend invitations table

-- Add member_id foreign key link from invitations to family_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'member_id'
    ) THEN
        ALTER TABLE invitations ADD COLUMN member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create indexes for better performance

-- Index on family_members.invite_token for quick lookups
CREATE INDEX IF NOT EXISTS idx_family_members_invite_token ON family_members(invite_token);

-- Index on invitations.member_id for foreign key performance
CREATE INDEX IF NOT EXISTS idx_invitations_member_id ON invitations(member_id);

-- 4. Update existing data to ensure consistency

-- Ensure all existing family members have a valid role
UPDATE family_members 
SET role = 'member' 
WHERE role IS NULL OR role NOT IN ('member', 'admin');

-- Ensure family creators have admin role (this should already be done by previous migrations)
UPDATE family_members 
SET role = 'admin' 
WHERE user_id IN (
    SELECT admin_user_id FROM families WHERE id = family_members.family_id
)
AND role != 'admin';

-- 5. Create helper functions for invitation management

-- Function to generate unique invite tokens
CREATE OR REPLACE FUNCTION generate_family_member_invite_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$;

-- Function to link invitation to family member
CREATE OR REPLACE FUNCTION link_invitation_to_member(
    invitation_id uuid,
    family_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- Update the invitation to link it to the family member
    UPDATE invitations 
    SET member_id = family_member_id
    WHERE id = invitation_id;
    
    -- Update the family member with the invitation token
    UPDATE family_members 
    SET invite_token = (SELECT token::uuid FROM invitations WHERE id = invitation_id)
    WHERE id = family_member_id;
    
    RETURN FOUND;
END;
$$;

-- Function to clear invitation links when invitation is accepted/declined
CREATE OR REPLACE FUNCTION clear_invitation_link(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- Clear the invite_token from family_members
    UPDATE family_members 
    SET invite_token = NULL
    WHERE invite_token = (SELECT token::uuid FROM invitations WHERE id = invitation_id);
END;
$$;

-- 6. Create trigger to automatically clear invitation links when status changes

CREATE OR REPLACE FUNCTION handle_invitation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, extensions
AS $$
BEGIN
    -- If invitation status changed to accepted, declined, or expired
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined', 'expired') THEN
        -- Clear the invitation link
        PERFORM clear_invitation_link(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for invitation status changes
DROP TRIGGER IF EXISTS invitation_status_change_trigger ON invitations;
CREATE TRIGGER invitation_status_change_trigger
    AFTER UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_invitation_status_change();

-- 7. Grant necessary permissions

-- Grant execute permissions to authenticated users for the new functions
GRANT EXECUTE ON FUNCTION generate_family_member_invite_token() TO authenticated;
GRANT EXECUTE ON FUNCTION link_invitation_to_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_invitation_link(uuid) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION generate_family_member_invite_token() FROM public;
REVOKE EXECUTE ON FUNCTION link_invitation_to_member(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION clear_invitation_link(uuid) FROM public;

-- 8. Verify the schema changes

DO $$
DECLARE
    role_column_exists boolean;
    invite_token_column_exists boolean;
    member_id_column_exists boolean;
    role_constraint_exists boolean;
BEGIN
    -- Check if all columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'role'
    ) INTO role_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'invite_token'
    ) INTO invite_token_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'member_id'
    ) INTO member_id_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'family_members' AND constraint_name = 'family_members_role_check'
    ) INTO role_constraint_exists;
    
    -- Log results
    RAISE LOG 'Schema verification:';
    RAISE LOG '- family_members.role column exists: %', role_column_exists;
    RAISE LOG '- family_members.invite_token column exists: %', invite_token_column_exists;
    RAISE LOG '- invitations.member_id column exists: %', member_id_column_exists;
    RAISE LOG '- family_members role constraint exists: %', role_constraint_exists;
    
    IF role_column_exists AND invite_token_column_exists AND member_id_column_exists AND role_constraint_exists THEN
        RAISE LOG 'SUCCESS: All schema extensions completed successfully';
    ELSE
        RAISE LOG 'WARNING: Some schema extensions may have failed';
    END IF;
END $$;