/*
  # Add updated_at column to invitations table

  1. Schema Changes
    - Add `updated_at` column to `invitations` table with default value and auto-update trigger
    - Set default value to current timestamp for existing records

  2. Triggers
    - The existing `update_invitations_updated_at` trigger will now work correctly
    - This trigger automatically updates the `updated_at` field when records are modified

  This fixes the error: "record 'new' has no field 'updated_at'" that occurs when 
  resending invitations due to the missing column.
*/

-- Add updated_at column to invitations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE invitations ADD COLUMN updated_at timestamptz DEFAULT now();
    
    -- Update existing records to have the updated_at value set to created_at
    UPDATE invitations SET updated_at = created_at WHERE updated_at IS NULL;
    
    -- Make the column NOT NULL after setting default values
    ALTER TABLE invitations ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;