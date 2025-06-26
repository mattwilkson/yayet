/*
  # Security Testing and Data Isolation Verification

  1. Security Tests
    - Create functions to test data isolation between families
    - Verify RLS policies prevent cross-family access
    - Test user profile isolation

  2. Data Isolation Tests
    - Test family member isolation
    - Test event isolation
    - Test invitation isolation

  3. Performance Monitoring
    - Add functions to monitor query performance
    - Check for missing indexes
*/

-- Function to test data isolation (main security test)
CREATE OR REPLACE FUNCTION test_data_isolation()
RETURNS TABLE (
    test_name TEXT,
    result TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- Test 1: Verify users can only see their own profile
    RETURN QUERY
    SELECT 
        'User Profile Isolation'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM users 
                WHERE id != auth.uid()
            ) THEN 'FAIL - Can see other user profiles'::TEXT
            ELSE 'PASS - Only own profile visible'::TEXT
        END,
        'Users should only see their own profile via RLS'::TEXT;
    
    -- Test 2: Verify family isolation
    RETURN QUERY
    SELECT 
        'Family Data Isolation'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM families f
                WHERE f.admin_user_id != auth.uid()
                AND f.id NOT IN (
                    SELECT family_id FROM users WHERE id = auth.uid()
                )
            ) THEN 'FAIL - Can see other families'::TEXT
            ELSE 'PASS - Only own family visible'::TEXT
        END,
        'Users should only see their own family data'::TEXT;
    
    -- Test 3: Verify family member isolation
    RETURN QUERY
    SELECT 
        'Family Member Isolation'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM family_members fm
                WHERE fm.family_id NOT IN (
                    SELECT COALESCE(family_id, '00000000-0000-0000-0000-000000000000'::uuid) 
                    FROM users 
                    WHERE id = auth.uid()
                )
            ) THEN 'FAIL - Can see other family members'::TEXT
            ELSE 'PASS - Only own family members visible'::TEXT
        END,
        'Users should only see members from their own family'::TEXT;
    
    -- Test 4: Verify event isolation
    RETURN QUERY
    SELECT 
        'Event Isolation'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM events e
                WHERE e.family_id NOT IN (
                    SELECT COALESCE(family_id, '00000000-0000-0000-0000-000000000000'::uuid) 
                    FROM users 
                    WHERE id = auth.uid()
                )
            ) THEN 'FAIL - Can see other family events'::TEXT
            ELSE 'PASS - Only own family events visible'::TEXT
        END,
        'Users should only see events from their own family'::TEXT;
    
    -- Test 5: Verify invitation isolation
    RETURN QUERY
    SELECT 
        'Invitation Isolation'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM invitations i
                WHERE i.inviter_user_id != auth.uid()
                AND i.invited_email != auth.email()
                AND i.family_id NOT IN (
                    SELECT COALESCE(family_id, '00000000-0000-0000-0000-000000000000'::uuid) 
                    FROM users 
                    WHERE id = auth.uid()
                )
            ) THEN 'FAIL - Can see other family invitations'::TEXT
            ELSE 'PASS - Only relevant invitations visible'::TEXT
        END,
        'Users should only see invitations they sent or received'::TEXT;
END;
$$;

-- Function to check database performance and indexes
CREATE OR REPLACE FUNCTION check_database_performance()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    -- Check for family_id index on events table
    RETURN QUERY
    SELECT 
        'Events Family ID Index'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'events' 
                AND indexname LIKE '%family_id%'
            ) THEN 'GOOD'::TEXT
            ELSE 'MISSING'::TEXT
        END,
        'CREATE INDEX idx_events_family_id ON events(family_id);'::TEXT;
    
    -- Check for user_id index on family_members table
    RETURN QUERY
    SELECT 
        'Family Members User ID Index'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'family_members' 
                AND indexname LIKE '%user_id%'
            ) THEN 'GOOD'::TEXT
            ELSE 'MISSING'::TEXT
        END,
        'CREATE INDEX idx_family_members_user_id ON family_members(user_id);'::TEXT;
    
    -- Check for family_id index on family_members table
    RETURN QUERY
    SELECT 
        'Family Members Family ID Index'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'family_members' 
                AND indexname LIKE '%family_id%'
            ) THEN 'GOOD'::TEXT
            ELSE 'MISSING'::TEXT
        END,
        'CREATE INDEX idx_family_members_family_id ON family_members(family_id);'::TEXT;
    
    -- Check for family_id index on invitations table
    RETURN QUERY
    SELECT 
        'Invitations Family ID Index'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'invitations' 
                AND indexname LIKE '%family_id%'
            ) THEN 'GOOD'::TEXT
            ELSE 'MISSING'::TEXT
        END,
        'Already exists - idx_invitations_family_id'::TEXT;
    
    -- Check table sizes for performance monitoring
    RETURN QUERY
    SELECT 
        'Events Table Size'::TEXT,
        (SELECT COUNT(*)::TEXT FROM events) || ' records',
        'Monitor for performance as table grows'::TEXT;
    
    RETURN QUERY
    SELECT 
        'Family Members Table Size'::TEXT,
        (SELECT COUNT(*)::TEXT FROM family_members) || ' records',
        'Monitor for performance as table grows'::TEXT;
    
    RETURN QUERY
    SELECT 
        'Families Table Size'::TEXT,
        (SELECT COUNT(*)::TEXT FROM families) || ' records',
        'Monitor for performance as table grows'::TEXT;
END;
$$;

-- Function to verify RLS policies exist and are enabled
CREATE OR REPLACE FUNCTION check_rls_policies()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.row_security::BOOLEAN,
        COALESCE(p.policy_count, 0)::INTEGER,
        CASE 
            WHEN t.row_security AND COALESCE(p.policy_count, 0) > 0 THEN 'PROTECTED'::TEXT
            WHEN t.row_security AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS_ENABLED_NO_POLICIES'::TEXT
            WHEN NOT t.row_security THEN 'RLS_DISABLED'::TEXT
            ELSE 'UNKNOWN'::TEXT
        END
    FROM (
        SELECT 
            schemaname,
            tablename as table_name,
            rowsecurity as row_security
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'families', 'family_members', 'events', 'event_assignments', 'invitations', 'holidays')
    ) t
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) p ON t.schemaname = p.schemaname AND t.table_name = p.tablename
    ORDER BY t.table_name;
END;
$$;

-- Function to simulate multi-family load testing
CREATE OR REPLACE FUNCTION simulate_multi_family_load()
RETURNS TABLE (
    test_scenario TEXT,
    execution_time_ms NUMERIC,
    result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_ms NUMERIC;
BEGIN
    -- Test 1: Query events with family filter (simulates dashboard load)
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM events WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
    );
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'Dashboard Events Query'::TEXT,
        duration_ms,
        CASE 
            WHEN duration_ms < 100 THEN 'FAST'::TEXT
            WHEN duration_ms < 500 THEN 'ACCEPTABLE'::TEXT
            ELSE 'SLOW'::TEXT
        END;
    
    -- Test 2: Query family members (simulates family management load)
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM family_members WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
    );
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'Family Members Query'::TEXT,
        duration_ms,
        CASE 
            WHEN duration_ms < 50 THEN 'FAST'::TEXT
            WHEN duration_ms < 200 THEN 'ACCEPTABLE'::TEXT
            ELSE 'SLOW'::TEXT
        END;
    
    -- Test 3: Complex join query (simulates event assignments)
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM events e
    JOIN event_assignments ea ON e.id = ea.event_id
    JOIN family_members fm ON ea.family_member_id = fm.id
    WHERE e.family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
    );
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY
    SELECT 
        'Complex Event Assignment Query'::TEXT,
        duration_ms,
        CASE 
            WHEN duration_ms < 200 THEN 'FAST'::TEXT
            WHEN duration_ms < 1000 THEN 'ACCEPTABLE'::TEXT
            ELSE 'SLOW'::TEXT
        END;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION test_data_isolation() TO authenticated;
GRANT EXECUTE ON FUNCTION check_database_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_multi_family_load() TO authenticated;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION test_data_isolation() FROM public;
REVOKE EXECUTE ON FUNCTION check_database_performance() FROM public;
REVOKE EXECUTE ON FUNCTION check_rls_policies() FROM public;
REVOKE EXECUTE ON FUNCTION simulate_multi_family_load() FROM public;

-- Log successful migration
DO $$
BEGIN
    RAISE LOG 'Security testing functions created successfully';
    RAISE LOG 'Available functions:';
    RAISE LOG '- test_data_isolation(): Tests RLS policy isolation';
    RAISE LOG '- check_database_performance(): Checks indexes and performance';
    RAISE LOG '- check_rls_policies(): Verifies RLS is properly configured';
    RAISE LOG '- simulate_multi_family_load(): Tests query performance under load';
    RAISE LOG '';
    RAISE LOG 'To run tests, execute: SELECT * FROM test_data_isolation();';
    RAISE LOG 'To check performance: SELECT * FROM check_database_performance();';
    RAISE LOG 'To verify RLS: SELECT * FROM check_rls_policies();';
    RAISE LOG 'To test load: SELECT * FROM simulate_multi_family_load();';
END $$;