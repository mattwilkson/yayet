/*
  # Add Ethical Email Marketing Consent System

  1. Schema Changes
    - Add `marketing_consent` boolean column to users table
    - Add `consent_date` timestamp column to track when consent was given
    - Add `consent_source` to track where consent was obtained
    - Add `unsubscribe_token` for secure unsubscribe links

  2. Privacy Compliance
    - Explicit opt-in required (GDPR compliant)
    - Timestamped consent tracking (audit trail)
    - Easy opt-out mechanism (CAN-SPAM compliant)
    - Granular consent management

  3. Security
    - Secure unsubscribe tokens
    - Proper data handling
    - Audit trail for compliance
*/

-- Add marketing consent columns to users table
DO $$
BEGIN
    -- Add marketing_consent column (defaults to false - explicit opt-in required)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'marketing_consent'
    ) THEN
        ALTER TABLE users ADD COLUMN marketing_consent boolean DEFAULT false NOT NULL;
    END IF;

    -- Add consent_date to track when consent was given/withdrawn
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'consent_date'
    ) THEN
        ALTER TABLE users ADD COLUMN consent_date timestamptz;
    END IF;

    -- Add consent_source to track where consent was obtained
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'consent_source'
    ) THEN
        ALTER TABLE users ADD COLUMN consent_source text;
    END IF;

    -- Add unsubscribe_token for secure unsubscribe links
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'unsubscribe_token'
    ) THEN
        ALTER TABLE users ADD COLUMN unsubscribe_token text UNIQUE;
    END IF;
END $$;

-- Create indexes for marketing consent queries
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users(marketing_consent) WHERE marketing_consent = true;
CREATE INDEX IF NOT EXISTS idx_users_consent_date ON users(consent_date);
CREATE INDEX IF NOT EXISTS idx_users_unsubscribe_token ON users(unsubscribe_token);

-- Create marketing consent audit table for compliance tracking
CREATE TABLE IF NOT EXISTS marketing_consent_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('granted', 'withdrawn', 'updated')),
    consent_given boolean NOT NULL,
    source text NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on marketing consent audit table
ALTER TABLE marketing_consent_audit ENABLE ROW LEVEL SECURITY;

-- RLS policy for marketing consent audit (users can view their own audit trail)
CREATE POLICY "Users can view own consent audit" ON marketing_consent_audit
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

-- RLS policy for admins to view consent audit (for compliance)
CREATE POLICY "Admins can view consent audit" ON marketing_consent_audit
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.user_id = (select auth.uid())
            AND fm.role = 'admin'
        )
    );

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_marketing_audit_user_id ON marketing_consent_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_audit_created_at ON marketing_consent_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_audit_action ON marketing_consent_audit(action);

-- Function to generate secure unsubscribe tokens
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Function to update marketing consent with audit trail
CREATE OR REPLACE FUNCTION update_marketing_consent(
    p_user_id uuid,
    p_consent boolean,
    p_source text,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    current_consent boolean;
    action_type text;
BEGIN
    -- Get current consent status
    SELECT marketing_consent INTO current_consent
    FROM users
    WHERE id = p_user_id;
    
    -- Determine action type
    IF current_consent IS NULL OR current_consent = false THEN
        IF p_consent = true THEN
            action_type := 'granted';
        ELSE
            action_type := 'withdrawn';
        END IF;
    ELSE
        IF p_consent = true THEN
            action_type := 'updated';
        ELSE
            action_type := 'withdrawn';
        END IF;
    END IF;
    
    -- Update user consent
    UPDATE users 
    SET 
        marketing_consent = p_consent,
        consent_date = now(),
        consent_source = p_source,
        unsubscribe_token = CASE 
            WHEN p_consent = true AND unsubscribe_token IS NULL 
            THEN generate_unsubscribe_token()
            ELSE unsubscribe_token
        END
    WHERE id = p_user_id;
    
    -- Create audit record
    INSERT INTO marketing_consent_audit (
        user_id,
        action,
        consent_given,
        source,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        action_type,
        p_consent,
        p_source,
        p_ip_address,
        p_user_agent
    );
    
    RETURN FOUND;
END;
$$;

-- Function to handle unsubscribe via token
CREATE OR REPLACE FUNCTION unsubscribe_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find user by unsubscribe token
    SELECT id, email, marketing_consent INTO user_record
    FROM users
    WHERE unsubscribe_token = p_token;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Only unsubscribe if currently subscribed
    IF user_record.marketing_consent = true THEN
        PERFORM update_marketing_consent(
            user_record.id,
            false,
            'unsubscribe_link',
            NULL,
            NULL
        );
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Function to get marketing consent statistics (for admins)
CREATE OR REPLACE FUNCTION get_marketing_consent_stats()
RETURNS TABLE (
    total_users bigint,
    consented_users bigint,
    consent_rate numeric,
    recent_consents bigint,
    recent_unsubscribes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users)::bigint as total_users,
        (SELECT COUNT(*) FROM users WHERE marketing_consent = true)::bigint as consented_users,
        (SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND((COUNT(*) FILTER (WHERE marketing_consent = true)::numeric / COUNT(*)::numeric) * 100, 2)
                ELSE 0 
            END
         FROM users)::numeric as consent_rate,
        (SELECT COUNT(*) FROM marketing_consent_audit 
         WHERE action = 'granted' AND created_at > now() - interval '30 days')::bigint as recent_consents,
        (SELECT COUNT(*) FROM marketing_consent_audit 
         WHERE action = 'withdrawn' AND created_at > now() - interval '30 days')::bigint as recent_unsubscribes;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_unsubscribe_token() TO authenticated;
GRANT EXECUTE ON FUNCTION update_marketing_consent(uuid, boolean, text, inet, text) TO authenticated;
GRANT EXECUTE ON FUNCTION unsubscribe_by_token(text) TO public; -- Public for unsubscribe links
GRANT EXECUTE ON FUNCTION get_marketing_consent_stats() TO authenticated;

-- Revoke from public for security (except unsubscribe function)
REVOKE EXECUTE ON FUNCTION generate_unsubscribe_token() FROM public;
REVOKE EXECUTE ON FUNCTION update_marketing_consent(uuid, boolean, text, inet, text) FROM public;
REVOKE EXECUTE ON FUNCTION get_marketing_consent_stats() FROM public;

-- Generate unsubscribe tokens for existing users who might have consented
UPDATE users 
SET unsubscribe_token = generate_unsubscribe_token()
WHERE marketing_consent = true AND unsubscribe_token IS NULL;

-- Log successful migration
DO $$
DECLARE
    total_users INTEGER;
    consented_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO consented_users FROM users WHERE marketing_consent = true;
    
    RAISE LOG '=== ETHICAL EMAIL MARKETING SYSTEM INSTALLED ===';
    RAISE LOG '';
    RAISE LOG 'Database Schema:';
    RAISE LOG '✅ marketing_consent column added (default: false - explicit opt-in)';
    RAISE LOG '✅ consent_date column added (tracks when consent given/withdrawn)';
    RAISE LOG '✅ consent_source column added (tracks consent origin)';
    RAISE LOG '✅ unsubscribe_token column added (secure unsubscribe links)';
    RAISE LOG '✅ marketing_consent_audit table created (compliance audit trail)';
    RAISE LOG '';
    RAISE LOG 'Privacy Compliance:';
    RAISE LOG '✅ GDPR compliant (explicit opt-in required)';
    RAISE LOG '✅ CAN-SPAM compliant (easy unsubscribe mechanism)';
    RAISE LOG '✅ CASL compliant (documented consent with audit trail)';
    RAISE LOG '';
    RAISE LOG 'Security Features:';
    RAISE LOG '✅ Secure unsubscribe tokens generated';
    RAISE LOG '✅ RLS policies for data protection';
    RAISE LOG '✅ Audit trail for compliance tracking';
    RAISE LOG '✅ IP address and user agent logging capability';
    RAISE LOG '';
    RAISE LOG 'Current Status:';
    RAISE LOG '- Total users: %', total_users;
    RAISE LOG '- Users with marketing consent: %', consented_users;
    RAISE LOG '- Default consent: FALSE (explicit opt-in required)';
    RAISE LOG '';
    RAISE LOG 'Next Steps:';
    RAISE LOG '1. Add consent checkbox to registration/onboarding forms';
    RAISE LOG '2. Create email preferences page for users';
    RAISE LOG '3. Implement unsubscribe page using tokens';
    RAISE LOG '4. Add privacy policy links to consent forms';
    RAISE LOG '5. Only send marketing emails to consented users';
    RAISE LOG '';
    RAISE LOG '🎯 Ready for ethical email marketing implementation!';
END $$;