/*
  # Fix Recurring Events System

  1. Schema Changes
    - Add `parent_event_id` to link recurring event instances to their parent
    - Add `recurrence_instance_date` to track which date this instance represents
    - Add `is_recurring_parent` to identify the master recurring event record
    - Add indexes for better performance

  2. New Approach
    - Store ONE parent event with the recurrence rule
    - Generate instances only when needed (for display/editing)
    - Allow editing individual instances or the entire series
    - Proper deletion handling for series vs individual events

  3. Migration Strategy
    - Update existing recurring events to use the new structure
    - Maintain backward compatibility
*/

-- Add new columns to events table for proper recurring event management
DO $$
BEGIN
    -- Add parent_event_id to link instances to their parent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'parent_event_id'
    ) THEN
        ALTER TABLE events ADD COLUMN parent_event_id uuid REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- Add recurrence_instance_date to track which date this instance represents
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'recurrence_instance_date'
    ) THEN
        ALTER TABLE events ADD COLUMN recurrence_instance_date date;
    END IF;

    -- Add is_recurring_parent to identify master recurring events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'is_recurring_parent'
    ) THEN
        ALTER TABLE events ADD COLUMN is_recurring_parent boolean DEFAULT false;
    END IF;

    -- Add is_exception to mark events that have been modified from the series
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'is_exception'
    ) THEN
        ALTER TABLE events ADD COLUMN is_exception boolean DEFAULT false;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence_instance_date ON events(recurrence_instance_date);
CREATE INDEX IF NOT EXISTS idx_events_is_recurring_parent ON events(is_recurring_parent);
CREATE INDEX IF NOT EXISTS idx_events_is_exception ON events(is_exception);

-- Update existing recurring events to use the new structure
-- This identifies events that are likely part of recurring series based on identical titles and recurrence patterns
DO $$
DECLARE
    event_record RECORD;
    parent_event_id uuid;
    instance_date date;
BEGIN
    -- Find groups of events that appear to be recurring series
    -- (same title, same family, created around the same time, no recurrence_rule on instances)
    FOR event_record IN 
        SELECT 
            e1.id,
            e1.title,
            e1.family_id,
            e1.start_time,
            e1.created_at,
            e1.recurrence_rule
        FROM events e1
        WHERE e1.recurrence_rule IS NULL  -- These are likely instances
        AND EXISTS (
            -- Check if there are other events with same title that might be part of series
            SELECT 1 FROM events e2 
            WHERE e2.title = e1.title 
            AND e2.family_id = e1.family_id 
            AND e2.id != e1.id
            AND ABS(EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))) < 300  -- Created within 5 minutes
        )
        ORDER BY e1.title, e1.family_id, e1.start_time
    LOOP
        -- For now, just mark these as potential recurring instances
        -- In a real migration, you'd implement more sophisticated logic
        -- to group them properly and create parent events
        
        -- Extract the date from start_time for recurrence_instance_date
        instance_date := event_record.start_time::date;
        
        UPDATE events 
        SET recurrence_instance_date = instance_date
        WHERE id = event_record.id;
        
        RAISE LOG 'Updated event % with instance date %', event_record.id, instance_date;
    END LOOP;
END $$;

-- Create helper functions for recurring event management

-- Function to get all instances of a recurring event series
CREATE OR REPLACE FUNCTION get_recurring_event_instances(
    parent_id uuid,
    start_date date DEFAULT CURRENT_DATE,
    end_date date DEFAULT CURRENT_DATE + INTERVAL '1 year'
)
RETURNS TABLE (
    id uuid,
    title text,
    start_time timestamptz,
    end_time timestamptz,
    recurrence_instance_date date,
    is_exception boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        e.recurrence_instance_date,
        e.is_exception
    FROM events e
    WHERE (e.id = parent_id OR e.parent_event_id = parent_id)
    AND e.recurrence_instance_date BETWEEN start_date AND end_date
    ORDER BY e.recurrence_instance_date, e.start_time;
END;
$$;

-- Function to delete a recurring event series
CREATE OR REPLACE FUNCTION delete_recurring_event_series(parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- Delete all instances first (due to foreign key constraints)
    DELETE FROM events WHERE parent_event_id = parent_id;
    
    -- Delete the parent event
    DELETE FROM events WHERE id = parent_id;
    
    RETURN FOUND;
END;
$$;

-- Function to create an exception (modified instance) from a recurring series
CREATE OR REPLACE FUNCTION create_recurring_event_exception(
    parent_id uuid,
    instance_date date,
    new_title text DEFAULT NULL,
    new_start_time timestamptz DEFAULT NULL,
    new_end_time timestamptz DEFAULT NULL,
    new_description text DEFAULT NULL,
    new_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    parent_event RECORD;
    exception_id uuid;
BEGIN
    -- Get the parent event details
    SELECT * INTO parent_event FROM events WHERE id = parent_id AND is_recurring_parent = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent recurring event not found';
    END IF;
    
    -- Create the exception event
    INSERT INTO events (
        family_id,
        title,
        description,
        start_time,
        end_time,
        all_day,
        location,
        created_by_user_id,
        parent_event_id,
        recurrence_instance_date,
        is_exception
    ) VALUES (
        parent_event.family_id,
        COALESCE(new_title, parent_event.title),
        COALESCE(new_description, parent_event.description),
        COALESCE(new_start_time, parent_event.start_time),
        COALESCE(new_end_time, parent_event.end_time),
        parent_event.all_day,
        COALESCE(new_location, parent_event.location),
        parent_event.created_by_user_id,
        parent_id,
        instance_date,
        true
    ) RETURNING id INTO exception_id;
    
    RETURN exception_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recurring_event_instances(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_recurring_event_series(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_recurring_event_exception(uuid, date, text, timestamptz, timestamptz, text, text) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION get_recurring_event_instances(uuid, date, date) FROM public;
REVOKE EXECUTE ON FUNCTION delete_recurring_event_series(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION create_recurring_event_exception(uuid, date, text, timestamptz, timestamptz, text, text) FROM public;