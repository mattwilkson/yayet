/*
  # Family Scheduler Database Schema
  
  1. New Tables
    - `users`: Store user authentication and profile data
      - `id` (uuid, primary key) - matches Supabase auth.users id
      - `email` (text, unique) - user email
      - `role` (enum) - user role in family
      - `family_id` (uuid, foreign key) - reference to families table
      - `created_at`, `updated_at` (timestamp)
    
    - `families`: Store family information
      - `id` (uuid, primary key)
      - `family_name` (text) - display name for family
      - `admin_user_id` (uuid, foreign key) - reference to admin user
      - `created_at`, `updated_at` (timestamp)
    
    - `family_members`: Store family member details
      - `id` (uuid, primary key)
      - `family_id` (uuid, foreign key) - reference to families
      - `user_id` (uuid, nullable foreign key) - if member is also a registered user
      - `name` (text) - member name
      - `relationship` (text) - relationship to family
      - `birthday`, `anniversary` (date, nullable) - special dates
      - `address` (text, nullable) - member address
      - `created_at`, `updated_at` (timestamp)
    
    - `events`: Store calendar events
      - `id` (uuid, primary key)
      - `family_id` (uuid, foreign key) - reference to families
      - `title` (text) - event title
      - `description` (text, nullable) - event description
      - `start_time`, `end_time` (timestamp) - event timing
      - `all_day` (boolean) - all day event flag
      - `location` (text, nullable) - event location
      - `recurrence_rule` (text, nullable) - recurrence pattern
      - `created_by_user_id` (uuid, foreign key) - creator reference
      - `created_at`, `updated_at` (timestamp)
    
    - `event_assignments`: Link events to family members (who it's for)
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key) - reference to events
      - `family_member_id` (uuid, foreign key) - reference to family_members
      - `created_at` (timestamp)
    
    - `event_responsibilities`: Link events to responsible users
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key) - reference to events
      - `user_id` (uuid, foreign key) - reference to users
      - `created_at` (timestamp)
    
    - `holidays`: Store holiday information
      - `id` (uuid, primary key)
      - `name` (text) - holiday name
      - `date` (date) - holiday date
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for family-based access control
    - Ensure users can only access their family's data
    - Admin users have additional privileges

  3. Functions
    - Trigger to automatically create user profile on auth signup
    - Updated timestamp triggers for all tables
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'immediate_family', 'extended_family', 'helper');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create families table
CREATE TABLE IF NOT EXISTS families (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name text NOT NULL,
    admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    role user_role DEFAULT 'immediate_family',
    family_id uuid REFERENCES families(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
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
CREATE TABLE IF NOT EXISTS events (
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
CREATE TABLE IF NOT EXISTS event_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, family_member_id)
);

-- Create event_responsibilities table
CREATE TABLE IF NOT EXISTS event_responsibilities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
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
ALTER TABLE event_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Families: Users can only access their own family
CREATE POLICY "Users can view own family" ON families
    FOR SELECT USING (
        admin_user_id = auth.uid() OR 
        id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admin can update own family" ON families
    FOR UPDATE USING (admin_user_id = auth.uid());

CREATE POLICY "Users can create families" ON families
    FOR INSERT WITH CHECK (admin_user_id = auth.uid());

-- Users: Users can view family members and update themselves
CREATE POLICY "Users can view family users" ON users
    FOR SELECT USING (
        id = auth.uid() OR 
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update themselves" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert themselves" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Family Members: Family-based access
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Family users can manage members" ON family_members
    FOR ALL USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

-- Events: Family-based access with role considerations
CREATE POLICY "Users can view family events" ON events
    FOR SELECT USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Family users can manage events" ON events
    FOR ALL USING (
        family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    );

-- Event Assignments: Family-based access
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

-- Event Responsibilities: Family-based access  
CREATE POLICY "Users can view event responsibilities" ON event_responsibilities
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events 
            WHERE family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Family users can manage event responsibilities" ON event_responsibilities
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events 
            WHERE family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
        )
    );

-- Holidays: Public read access
CREATE POLICY "Anyone can view holidays" ON holidays
    FOR SELECT USING (true);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'immediate_family');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamps
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

-- Insert some sample holidays
INSERT INTO holidays (name, date) VALUES 
    ('New Year''s Day', '2025-01-01'),
    ('Valentine''s Day', '2025-02-14'),
    ('Independence Day', '2025-07-04'),
    ('Halloween', '2025-10-31'),
    ('Thanksgiving', '2025-11-27'),
    ('Christmas Day', '2025-12-25')
ON CONFLICT DO NOTHING;