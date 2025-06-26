/*
  # Add Family Member Categories and Nicknames

  1. Schema Changes
    - Add `nickname` field to family_members table
    - Add `category` field to family_members table with enum type
    - Update existing data to have appropriate categories

  2. Categories
    - immediate_family: Mother, Father, Son, Daughter
    - extended_family: Grandpa, Grandma, Uncle, Aunt, Cousin
    - caregiver: Caregiver, Helper, Other non-family
    - pet: Dog, Cat, Other pets

  3. Security
    - Maintain existing RLS policies
    - No changes to access control needed
*/

-- Create family member category enum
DO $$ BEGIN
    CREATE TYPE family_member_category AS ENUM ('immediate_family', 'extended_family', 'caregiver', 'pet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to family_members table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'nickname'
    ) THEN
        ALTER TABLE family_members ADD COLUMN nickname text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'category'
    ) THEN
        ALTER TABLE family_members ADD COLUMN category family_member_category DEFAULT 'immediate_family';
    END IF;
END $$;

-- Update existing family members with appropriate categories based on relationship
UPDATE family_members SET category = 'immediate_family' 
WHERE relationship IN ('Father', 'Mother', 'Son', 'Daughter');

UPDATE family_members SET category = 'extended_family' 
WHERE relationship IN ('Grandpa', 'Grandma', 'Uncle', 'Aunt', 'Cousin');

UPDATE family_members SET category = 'caregiver' 
WHERE relationship IN ('Caregiver', 'Other');

UPDATE family_members SET category = 'pet' 
WHERE relationship IN ('Dog', 'Cat');

-- Create index for better performance on category queries
CREATE INDEX IF NOT EXISTS idx_family_members_category ON family_members(category);