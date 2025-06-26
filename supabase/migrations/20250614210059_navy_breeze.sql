/*
  # Add Color System for Family Members

  1. New Columns
    - Add `color` column to family_members table for custom colors
    - Add default colors based on category

  2. Updates
    - Set default colors for existing family members
    - Create index for better performance
*/

-- Add color column to family_members table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'family_members' AND column_name = 'color'
    ) THEN
        ALTER TABLE family_members ADD COLUMN color text DEFAULT '#3B82F6';
    END IF;
END $$;

-- Set default colors for existing family members based on category
UPDATE family_members SET color = '#3B82F6' WHERE category = 'immediate_family' AND (color IS NULL OR color = '#3B82F6');
UPDATE family_members SET color = '#8B5CF6' WHERE category = 'extended_family' AND (color IS NULL OR color = '#3B82F6');
UPDATE family_members SET color = '#10B981' WHERE category = 'caregiver' AND (color IS NULL OR color = '#3B82F6');
UPDATE family_members SET color = '#F59E0B' WHERE category = 'pet' AND (color IS NULL OR color = '#3B82F6');

-- Add a special "Whole Family" member for each family
INSERT INTO family_members (family_id, name, relationship, category, color)
SELECT 
    f.id,
    'Whole Family',
    'Family',
    'immediate_family',
    '#DC2626'
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.family_id = f.id AND fm.name = 'Whole Family'
)
ON CONFLICT DO NOTHING;