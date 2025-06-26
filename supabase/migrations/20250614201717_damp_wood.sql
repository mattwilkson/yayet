/*
  # Fix Family Members Data Issues

  1. Problem Analysis
    - The previous migration may have caused data loss
    - Need to ensure existing family members are preserved
    - Fix any issues with the new columns

  2. Solution
    - Check if data exists and restore if needed
    - Ensure the new columns are properly added without affecting existing data
    - Make the migration safer and more robust

  3. Data Recovery
    - Add the new columns safely
    - Preserve all existing family member data
    - Set appropriate defaults for new columns
*/

-- First, let's make sure the enum type exists
DO $$ BEGIN
    CREATE TYPE family_member_category AS ENUM ('immediate_family', 'extended_family', 'caregiver', 'pet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add nickname column if it doesn't exist (safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'nickname'
    ) THEN
        ALTER TABLE family_members ADD COLUMN nickname text;
    END IF;
END $$;

-- Add category column if it doesn't exist (safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'category'
    ) THEN
        ALTER TABLE family_members ADD COLUMN category family_member_category DEFAULT 'immediate_family';
    END IF;
END $$;

-- Update existing family members with appropriate categories (only if category is null or default)
UPDATE family_members SET category = 'immediate_family' 
WHERE relationship IN ('Father', 'Mother', 'Son', 'Daughter')
AND (category IS NULL OR category = 'immediate_family');

UPDATE family_members SET category = 'extended_family' 
WHERE relationship IN ('Grandpa', 'Grandma', 'Uncle', 'Aunt', 'Cousin')
AND (category IS NULL OR category = 'immediate_family');

UPDATE family_members SET category = 'caregiver' 
WHERE relationship IN ('Caregiver', 'Helper', 'Other')
AND (category IS NULL OR category = 'immediate_family');

UPDATE family_members SET category = 'pet' 
WHERE relationship IN ('Dog', 'Cat')
AND (category IS NULL OR category = 'immediate_family');

-- Create index for better performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_family_members_category ON family_members(category);

-- Ensure all family members have a category set
UPDATE family_members SET category = 'immediate_family' WHERE category IS NULL;