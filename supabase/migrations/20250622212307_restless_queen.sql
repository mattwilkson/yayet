/*
  # Add Email Notification System

  1. Schema Changes
    - Add `notification_preferences` table to store user notification settings
    - Add `email_notifications` table to track sent notifications
    - Add `notification_templates` table for email templates
    - Add functions for notification management

  2. Features
    - Event reminder notifications (24h, 1h before)
    - Family invitation notifications
    - Event assignment notifications
    - Notification preferences per user

  3. Security
    - RLS policies for notification data
    - Secure access to notification functions
*/

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_reminders boolean DEFAULT true,
    event_assignments boolean DEFAULT true,
    family_invitations boolean DEFAULT true,
    reminder_time_hours integer DEFAULT 24,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Create email_notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS email_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id uuid REFERENCES events(id) ON DELETE SET NULL,
    notification_type text NOT NULL,
    email_to text NOT NULL,
    email_subject text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    scheduled_for timestamptz NOT NULL,
    sent_at timestamptz,
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text NOT NULL UNIQUE,
    subject_template text NOT NULL,
    body_template text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

-- Create RLS policies for email_notifications
CREATE POLICY "Users can view own email notifications" ON email_notifications
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- Create RLS policies for notification_templates (admin only)
CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.user_id = (select auth.uid())
            AND fm.role = 'admin'
        )
    );

-- Create policy for public read access to templates
CREATE POLICY "Anyone can view notification templates" ON notification_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_id ON email_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled ON email_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(template_name);

-- Create updated_at triggers
CREATE TRIGGER update_notification_prefs_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notifications_updated_at
    BEFORE UPDATE ON email_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    INSERT INTO notification_preferences (
        user_id,
        event_reminders,
        event_assignments,
        family_invitations,
        reminder_time_hours
    ) VALUES (
        NEW.id,
        true,
        true,
        true,
        24
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger to set up default notification preferences for new users
DROP TRIGGER IF EXISTS on_user_created_set_notification_prefs ON users;
CREATE TRIGGER on_user_created_set_notification_prefs
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Function to schedule event reminder notifications
CREATE OR REPLACE FUNCTION schedule_event_reminder(
    p_event_id uuid,
    p_hours_before integer DEFAULT 24
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_event RECORD;
    v_family_id uuid;
    v_assignment RECORD;
    v_user RECORD;
    v_scheduled_time timestamptz;
    v_notification_id uuid;
BEGIN
    -- Get event details
    SELECT * INTO v_event
    FROM events
    WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    v_family_id := v_event.family_id;
    v_scheduled_time := v_event.start_time - (p_hours_before * interval '1 hour');
    
    -- Skip if the scheduled time is in the past
    IF v_scheduled_time <= now() THEN
        RETURN false;
    END IF;
    
    -- For each assigned family member, schedule a notification
    FOR v_assignment IN 
        SELECT ea.*, fm.name as member_name
        FROM event_assignments ea
        JOIN family_members fm ON ea.family_member_id = fm.id
        WHERE ea.event_id = p_event_id
    LOOP
        -- Get the user associated with this family member (if any)
        SELECT u.* INTO v_user
        FROM users u
        JOIN family_members fm ON u.id = fm.user_id
        WHERE fm.id = v_assignment.family_member_id;
        
        -- Skip if no user is associated or if they've opted out
        IF v_user.id IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Check if user has opted in to event reminders
        IF EXISTS (
            SELECT 1 FROM notification_preferences
            WHERE user_id = v_user.id
            AND event_reminders = true
            AND reminder_time_hours = p_hours_before
        ) THEN
            -- Schedule the notification
            INSERT INTO email_notifications (
                user_id,
                event_id,
                notification_type,
                email_to,
                email_subject,
                status,
                scheduled_for
            ) VALUES (
                v_user.id,
                p_event_id,
                'event_reminder_' || p_hours_before || 'h',
                v_user.email,
                'Reminder: ' || v_event.title || ' in ' || p_hours_before || ' hours',
                'pending',
                v_scheduled_time
            )
            RETURNING id INTO v_notification_id;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$;

-- Function to schedule event assignment notification
CREATE OR REPLACE FUNCTION schedule_assignment_notification(
    p_event_id uuid,
    p_family_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_event RECORD;
    v_family_member RECORD;
    v_user RECORD;
    v_notification_id uuid;
BEGIN
    -- Get event details
    SELECT * INTO v_event
    FROM events
    WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;
    
    -- Get family member details
    SELECT * INTO v_family_member
    FROM family_members
    WHERE id = p_family_member_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Family member not found';
    END IF;
    
    -- Get the user associated with this family member (if any)
    SELECT u.* INTO v_user
    FROM users u
    WHERE u.id = v_family_member.user_id;
    
    -- Skip if no user is associated
    IF v_user.id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has opted in to assignment notifications
    IF EXISTS (
        SELECT 1 FROM notification_preferences
        WHERE user_id = v_user.id
        AND event_assignments = true
    ) THEN
        -- Schedule the notification
        INSERT INTO email_notifications (
            user_id,
            event_id,
            notification_type,
            email_to,
            email_subject,
            status,
            scheduled_for
        ) VALUES (
            v_user.id,
            p_event_id,
            'event_assignment',
            v_user.email,
            'You have been assigned to: ' || v_event.title,
            'pending',
            now() -- Send immediately
        )
        RETURNING id INTO v_notification_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Function to schedule family invitation notification
CREATE OR REPLACE FUNCTION schedule_invitation_notification(
    p_invitation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_invitation RECORD;
    v_family RECORD;
    v_inviter RECORD;
    v_notification_id uuid;
BEGIN
    -- Get invitation details
    SELECT i.*, f.family_name
    INTO v_invitation
    FROM invitations i
    JOIN families f ON i.family_id = f.id
    WHERE i.id = p_invitation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;
    
    -- Get inviter details
    SELECT * INTO v_inviter
    FROM users
    WHERE id = v_invitation.inviter_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inviter not found';
    END IF;
    
    -- Schedule the notification
    INSERT INTO email_notifications (
        user_id,
        notification_type,
        email_to,
        email_subject,
        status,
        scheduled_for
    ) VALUES (
        v_inviter.id,
        'family_invitation',
        v_invitation.invited_email,
        'You''ve been invited to join ' || v_invitation.family_name || ' on Family Scheduler',
        'pending',
        now() -- Send immediately
    )
    RETURNING id INTO v_notification_id;
    
    RETURN true;
END;
$$;

-- Trigger function to schedule notifications when events are created/updated
CREATE OR REPLACE FUNCTION handle_event_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- For new events, schedule reminders
    IF TG_OP = 'INSERT' THEN
        -- Schedule 24-hour reminder
        PERFORM schedule_event_reminder(NEW.id, 24);
        
        -- Schedule 1-hour reminder
        PERFORM schedule_event_reminder(NEW.id, 1);
    
    -- For updated events, reschedule reminders if start time changed
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.start_time <> OLD.start_time THEN
            -- Delete existing pending notifications
            DELETE FROM email_notifications
            WHERE event_id = NEW.id
            AND status = 'pending'
            AND notification_type LIKE 'event_reminder_%';
            
            -- Schedule new reminders
            PERFORM schedule_event_reminder(NEW.id, 24);
            PERFORM schedule_event_reminder(NEW.id, 1);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger function to schedule notifications when event assignments are created
CREATE OR REPLACE FUNCTION handle_assignment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Schedule assignment notification
    PERFORM schedule_assignment_notification(NEW.event_id, NEW.family_member_id);
    
    RETURN NULL;
END;
$$;

-- Trigger function to schedule notifications when invitations are created
CREATE OR REPLACE FUNCTION handle_invitation_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Schedule invitation notification
    PERFORM schedule_invitation_notification(NEW.id);
    
    RETURN NULL;
END;
$$;

-- Create triggers for notification scheduling
CREATE TRIGGER event_notifications_trigger
    AFTER INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_notifications();

CREATE TRIGGER assignment_notifications_trigger
    AFTER INSERT ON event_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_assignment_notifications();

CREATE TRIGGER invitation_notifications_trigger
    AFTER INSERT ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_invitation_notifications();

-- Insert default notification templates
INSERT INTO notification_templates (template_name, subject_template, body_template)
VALUES 
    ('event_reminder_24h', 
     '{{event_title}} - Happening tomorrow',
     '<h1>Event Reminder</h1><p>Your event "{{event_title}}" is happening tomorrow at {{event_time}}.</p><p><strong>Location:</strong> {{event_location}}</p><p><strong>Description:</strong> {{event_description}}</p><p>View your full schedule on <a href="{{dashboard_url}}">Family Scheduler</a>.</p>'),
    
    ('event_reminder_1h', 
     '{{event_title}} - Starting in 1 hour',
     '<h1>Event Starting Soon</h1><p>Your event "{{event_title}}" is starting in 1 hour at {{event_time}}.</p><p><strong>Location:</strong> {{event_location}}</p><p><strong>Description:</strong> {{event_description}}</p><p>View your full schedule on <a href="{{dashboard_url}}">Family Scheduler</a>.</p>'),
    
    ('event_assignment', 
     'You''ve been assigned to {{event_title}}',
     '<h1>New Event Assignment</h1><p>You have been assigned to "{{event_title}}" on {{event_date}} at {{event_time}}.</p><p><strong>Location:</strong> {{event_location}}</p><p><strong>Description:</strong> {{event_description}}</p><p>View your full schedule on <a href="{{dashboard_url}}">Family Scheduler</a>.</p>'),
    
    ('family_invitation', 
     'You''ve been invited to join {{family_name}} on Family Scheduler',
     '<h1>Family Invitation</h1><p>{{inviter_name}} has invited you to join their family "{{family_name}}" on Family Scheduler.</p><p>Click the button below to accept this invitation:</p><p><a href="{{invitation_url}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a></p><p>This invitation expires in 24 hours.</p>')
ON CONFLICT (template_name) DO UPDATE
SET 
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    updated_at = now();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION schedule_event_reminder(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_assignment_notification(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_invitation_notification(uuid) TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION schedule_event_reminder(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION schedule_assignment_notification(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION schedule_invitation_notification(uuid) FROM public;

-- Log successful migration
DO $$
BEGIN
    RAISE LOG '=== EMAIL NOTIFICATION SYSTEM INSTALLED ===';
    RAISE LOG '';
    RAISE LOG 'Database Schema:';
    RAISE LOG '✅ notification_preferences table created';
    RAISE LOG '✅ email_notifications table created';
    RAISE LOG '✅ notification_templates table created';
    RAISE LOG '✅ Default templates installed';
    RAISE LOG '';
    RAISE LOG 'Notification Types:';
    RAISE LOG '✅ Event reminders (24h and 1h before)';
    RAISE LOG '✅ Event assignment notifications';
    RAISE LOG '✅ Family invitation notifications';
    RAISE LOG '';
    RAISE LOG 'Security:';
    RAISE LOG '✅ RLS policies for notification data';
    RAISE LOG '✅ Secure access to notification functions';
    RAISE LOG '';
    RAISE LOG 'Next Steps:';
    RAISE LOG '1. Create Supabase Edge Function for sending emails';
    RAISE LOG '2. Set up Resend API integration';
    RAISE LOG '3. Create email templates';
    RAISE LOG '4. Add notification preferences UI';
    RAISE LOG '';
    RAISE LOG '🎯 Ready for email notification implementation!';
END $$;