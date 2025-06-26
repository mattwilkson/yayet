/*
  # Fix Partial Date Storage for Birthdays/Anniversaries

  1. Problem
    - birthday and anniversary columns are DATE type which requires full YYYY-MM-DD format
    - Users want to store MM/DD format (without year) for recurring dates
    - Current validation rejects MM/DD inputs

  2. Solution
    - Change birthday and anniversary columns from DATE to TEXT
    - This allows storing both MM/DD and MM/DD/YYYY formats
    - Update validation to accept both formats
    - Preserve existing data during migration

  3. Data Migration
    - Convert existing YYYY-MM-DD dates to MM/DD/YYYY format for display
    - Ensure no data loss during column type change
*/

-- First, add new text columns for birthday and anniversary
ALTER TABLE family_members ADD COLUMN birthday_new text;
ALTER TABLE family_members ADD COLUMN anniversary_new text;

-- Migrate existing data from DATE to TEXT format
-- Convert YYYY-MM-DD to MM/DD/YYYY format
UPDATE family_members 
SET birthday_new = CASE 
  WHEN birthday IS NOT NULL THEN 
    LPAD(EXTRACT(MONTH FROM birthday)::text, 2, '0') || '/' || 
    LPAD(EXTRACT(DAY FROM birthday)::text, 2, '0') || '/' ||
    EXTRACT(YEAR FROM birthday)::text
  ELSE NULL 
END;

UPDATE family_members 
SET anniversary_new = CASE 
  WHEN anniversary IS NOT NULL THEN 
    LPAD(EXTRACT(MONTH FROM anniversary)::text, 2, '0') || '/' || 
    LPAD(EXTRACT(DAY FROM anniversary)::text, 2, '0') || '/' ||
    EXTRACT(YEAR FROM anniversary)::text
  ELSE NULL 
END;

-- Drop the old DATE columns
ALTER TABLE family_members DROP COLUMN birthday;
ALTER TABLE family_members DROP COLUMN anniversary;

-- Rename the new columns to the original names
ALTER TABLE family_members RENAME COLUMN birthday_new TO birthday;
ALTER TABLE family_members RENAME COLUMN anniversary_new TO anniversary;

-- Add check constraints to ensure valid date formats
ALTER TABLE family_members ADD CONSTRAINT birthday_format_check 
  CHECK (birthday IS NULL OR birthday ~ '^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])(/[0-9]{4})?$');

ALTER TABLE family_members ADD CONSTRAINT anniversary_format_check 
  CHECK (anniversary IS NULL OR anniversary ~ '^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])(/[0-9]{4})?$');

-- Log the migration results
DO $$
DECLARE
    birthday_count INTEGER;
    anniversary_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO birthday_count FROM family_members WHERE birthday IS NOT NULL;
    SELECT COUNT(*) INTO anniversary_count FROM family_members WHERE anniversary IS NOT NULL;
    
    RAISE LOG 'Partial date migration completed:';
    RAISE LOG '- % birthday records migrated', birthday_count;
    RAISE LOG '- % anniversary records migrated', anniversary_count;
    RAISE LOG 'Birthday and anniversary columns now accept MM/DD and MM/DD/YYYY formats';
END $$;