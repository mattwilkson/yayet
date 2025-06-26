/*
  # Family Invitations and Admin Role Management System

  1. New Tables
    - `invitations`: Store pending family invitations
      - `id` (uuid, primary key)
      - `family_id` (uuid, foreign key to families)
      - `invited_email` (text) - email of invited person
      - `inviter_user_id` (uuid, foreign key to auth.users)
      - `status` (text) - pending, accepted, declined, expired
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `token` (text, unique) - unique invitation token

  2. Schema Updates
    - Add `role` column to `family_members` table
    - Support 'member' and 'admin' roles

  3. Security
    - Enable RLS on invitations table
    - Add policies for invitation management
    - Add policies for role management
    - Ensure proper access control
*/

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    invited_email text NOT NULL,
    inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    token text NOT NULL UNIQUE
);

-- Add role column to family_members table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'role'
    ) THEN
        ALTER TABLE family_members ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'));
    END IF;
END $$;

-- Update existing family members to have 'member' role if needed
UPDATE family_members SET role = 'member' WHERE role IS NULL;

-- Set family creators as admins (users who are admin_user_id in families table)
UPDATE family_members 
SET role = 'admin' 
WHERE user_id IN (
    SELECT admin_user_id 
    FROM families 
    WHERE families.id = family_members.family_id
);

-- Enable Row Level Security on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_family_id ON invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_email ON invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);

-- RLS Policies for invitations table

-- Allow inviter (admin) to create invitations
CREATE POLICY "Allow admin to create invitations" ON invitations
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        inviter_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM family_members fm 
            WHERE fm.user_id = auth.uid() 
            AND fm.family_id = invitations.family_id 
            AND fm.role = 'admin'
        )
    );

-- Allow invited user to view their pending invitations
CREATE POLICY "Allow invited user to view pending invitations" ON invitations
    FOR SELECT 
    TO authenticated 
    USING (
        invited_email = auth.email() AND 
        status = 'pending' AND 
        expires_at > now()
    );

-- Allow inviter to view their sent invitations
CREATE POLICY "Allow inviter to view their invitations" ON invitations
    FOR SELECT 
    TO authenticated 
    USING (inviter_user_id = auth.uid());

-- Allow family admins to view family invitations
CREATE POLICY "Allow family admins to view family invitations" ON invitations
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm 
            WHERE fm.user_id = auth.uid() 
            AND fm.family_id = invitations.family_id 
            AND fm.role = 'admin'
        )
    );

-- Allow invited user to update invitation status (accept/decline)
CREATE POLICY "Allow invited user to update invitation status" ON invitations
    FOR UPDATE 
    TO authenticated 
    USING (
        invited_email = auth.email() AND 
        status = 'pending' AND 
        expires_at > now()
    ) 
    WITH CHECK (
        invited_email = auth.email() AND
        status IN ('accepted', 'declined')
    );

-- Allow inviter to update invitation status (cancel, resend)
CREATE POLICY "Allow inviter to update their invitations" ON invitations
    FOR UPDATE 
    TO authenticated 
    USING (inviter_user_id = auth.uid())
    WITH CHECK (inviter_user_id = auth.uid());

-- Allow inviter to delete their invitations
CREATE POLICY "Allow inviter to delete their invitations" ON invitations
    FOR DELETE 
    TO authenticated 
    USING (inviter_user_id = auth.uid());

-- RLS Policies for family_members role management

-- Allow family admins to update member roles
CREATE POLICY "Allow admins to update family member roles" ON family_members
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm 
            WHERE fm.user_id = auth.uid() 
            AND fm.family_id = family_members.family_id 
            AND fm.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM family_members fm 
            WHERE fm.user_id = auth.uid() 
            AND fm.family_id = family_members.family_id 
            AND fm.role = 'admin'
        )
    );

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure at least one admin remains in family
CREATE OR REPLACE FUNCTION ensure_family_has_admin()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to ensure at least one admin remains
CREATE TRIGGER ensure_family_has_admin_trigger
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION ensure_family_has_admin();

-- Add updated_at trigger for invitations
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();