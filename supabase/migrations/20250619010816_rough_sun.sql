/*
  # Add Onboarding Complete Tracking

  1. New Column
    - Add `onboarding_complete` boolean column to users table
    - Default to false for new users
    - Set to true when onboarding is completed

  2. Updates
    - Update existing users to have onboarding_complete = true if they have a family_id
    - This ensures existing users don't get stuck in onboarding loop

  3. Security
    - No changes to RLS policies needed
    - Users can update their own onboarding status
*/

-- Add onboarding_complete column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'onboarding_complete'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_complete boolean DEFAULT false;
    END IF;
END $$;

-- Update existing users who have a family_id to mark onboarding as complete
UPDATE users 
SET onboarding_complete = true 
WHERE family_id IS NOT NULL AND (onboarding_complete IS NULL OR onboarding_complete = false);

-- Create index for better performance on onboarding queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_complete ON users(onboarding_complete);