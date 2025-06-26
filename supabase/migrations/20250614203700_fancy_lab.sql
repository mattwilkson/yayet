/*
  # Add driver/helper support to event assignments

  1. Changes
    - Add `is_driver_helper` boolean field to event_assignments table
    - This allows distinguishing between regular assignments and driver/helper assignments
    - Default to false for existing records

  2. Security
    - No changes to RLS policies needed as this is just an additional field
*/

-- Add is_driver_helper column to event_assignments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_assignments' AND column_name = 'is_driver_helper'
    ) THEN
        ALTER TABLE event_assignments ADD COLUMN is_driver_helper boolean DEFAULT false;
    END IF;
END $$;

-- Update the unique constraint to allow multiple assignments per event/member
-- (one regular, one driver/helper)
ALTER TABLE event_assignments DROP CONSTRAINT IF EXISTS event_assignments_event_id_family_member_id_key;

-- Create a new unique constraint that includes the is_driver_helper field
CREATE UNIQUE INDEX IF NOT EXISTS event_assignments_unique_assignment 
ON event_assignments (event_id, family_member_id, is_driver_helper);