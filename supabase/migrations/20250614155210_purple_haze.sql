/*
  # Fresh Start - Simplified Family Scheduler Database

  This migration completely resets the database with a much simpler approach
  that avoids the circular dependency issues we were having.

  1. New Tables (Simplified)
    - `users`: Basic user profiles
    - `families`: Family information  
    - `family_members`: Family member details
    - `events`: Calendar events
    - `event_assignments`: Event to family member assignments
    - `holidays`: Holiday information

  2. Security (Simplified)
    - Much simpler RLS policies that avoid circular dependencies
    - Users can only access their own data
    - Family data access through direct family_id matching

  3. Functions
    - Simple trigger to create user profiles
    - Updated timestamp triggers
*/

-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS event_responsibilities CASCADE;
DROP TABLE IF EXISTS event_assignments CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'immediate_family', 'extended_family', 'helper');

-- Create families table
CREATE TABLE families (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name text NOT NULL,
    admin_user_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text UNIQUE NOT NULL,
    role user_role DEFAULT 'immediate_family',
    family_id uuid REFERENCES families(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create family_members table
CREATE TABLE family_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    name text NOT NULL,
    relationship text NOT NULL,
    birthday date,
    anniversary date,
    address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    all_day boolean DEFAULT false,
    location text,
    recurrence_rule text,
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create event_assignments table
CREATE TABLE event_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, family_member_id)
);

-- Create holidays table
CREATE TABLE holidays (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    date date NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that avoid circular dependencies

-- Users: Only see your own record
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Families: Only see families you admin
CREATE POLICY "families_select_by_admin" ON families
    FOR SELECT USING (admin_user_id = auth.uid());

CREATE POLICY "families_insert_by_admin" ON families
    FOR INSERT WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "families_update_by_admin" ON families
    FOR UPDATE USING (admin_user_id = auth.uid());

-- Family Members: See members of your family
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Family users can manage members" ON family_members
    FOR ALL USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

-- Events: See events for your family
CREATE POLICY "Users can view family events" ON events
    FOR SELECT USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Family users can manage events" ON events
    FOR ALL USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

-- Event Assignments: See assignments for your family's events
CREATE POLICY "Users can view event assignments" ON event_assignments
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events 
            WHERE family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Family users can manage event assignments" ON event_assignments
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events 
            WHERE family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
        )
    );

-- Holidays: Everyone can see holidays
CREATE POLICY "Anyone can view holidays" ON holidays
    FOR SELECT USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'immediate_family')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample holidays
INSERT INTO holidays (name, date) VALUES 
    ('New Year''s Day', '2025-01-01'),
    ('Valentine''s Day', '2025-02-14'),
    ('Independence Day', '2025-07-04'),
    ('Halloween', '2025-10-31'),
    ('Thanksgiving', '2025-11-27'),
    ('Christmas Day', '2025-12-25')
ON CONFLICT DO NOTHING;