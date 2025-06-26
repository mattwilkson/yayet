/*
  # Add is_deleted column to events table

  1. Changes
    - Add `is_deleted` column to `events` table with default value FALSE
    - This enables soft deletion functionality for events
    - Existing events will automatically have is_deleted = FALSE

  2. Security
    - No RLS changes needed as this is just adding a column
    - Existing policies will continue to work

  3. Performance
    - Add index on is_deleted for efficient filtering
*/

-- Add the is_deleted column to the events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add an index on is_deleted for better query performance
CREATE INDEX IF NOT EXISTS idx_events_is_deleted 
ON public.events (is_deleted);

-- Add a partial index for active (non-deleted) events for even better performance
CREATE INDEX IF NOT EXISTS idx_events_active 
ON public.events (family_id, start_time) 
WHERE is_deleted = FALSE;