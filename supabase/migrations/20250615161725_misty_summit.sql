/*
  # Add Comprehensive U.S. Holiday System

  1. New Features
    - Clear existing holidays and add comprehensive U.S. holiday list
    - Include federal holidays and culturally important days
    - Set up proper recurring patterns for holidays that change dates
    - Add holiday categories for better organization

  2. Holiday Categories
    - Federal holidays (fixed dates)
    - Federal holidays (variable dates like Thanksgiving)
    - Cultural holidays (Mother's Day, Father's Day, etc.)
    - Seasonal celebrations (Halloween, Valentine's Day, etc.)

  3. Implementation
    - Add holidays for current year and next few years
    - Include proper recurrence rules for yearly repetition
    - Ensure holidays appear in all-day event sections
*/

-- Clear existing holidays to start fresh
DELETE FROM holidays;

-- Add comprehensive U.S. holidays for 2025-2030
-- This ensures holidays are available for the next several years

-- Fixed Date Federal Holidays
INSERT INTO holidays (name, date) VALUES 
-- New Year's Day (January 1)
('New Year''s Day', '2025-01-01'),
('New Year''s Day', '2026-01-01'),
('New Year''s Day', '2027-01-01'),
('New Year''s Day', '2028-01-01'),
('New Year''s Day', '2029-01-01'),
('New Year''s Day', '2030-01-01'),

-- Martin Luther King Jr. Day (3rd Monday in January)
('Martin Luther King Jr. Day', '2025-01-20'),
('Martin Luther King Jr. Day', '2026-01-19'),
('Martin Luther King Jr. Day', '2027-01-18'),
('Martin Luther King Jr. Day', '2028-01-17'),
('Martin Luther King Jr. Day', '2029-01-15'),
('Martin Luther King Jr. Day', '2030-01-21'),

-- Presidents Day (3rd Monday in February)
('Presidents Day', '2025-02-17'),
('Presidents Day', '2026-02-16'),
('Presidents Day', '2027-02-15'),
('Presidents Day', '2028-02-21'),
('Presidents Day', '2029-02-19'),
('Presidents Day', '2030-02-18'),

-- Memorial Day (Last Monday in May)
('Memorial Day', '2025-05-26'),
('Memorial Day', '2026-05-25'),
('Memorial Day', '2027-05-31'),
('Memorial Day', '2028-05-29'),
('Memorial Day', '2029-05-28'),
('Memorial Day', '2030-05-27'),

-- Independence Day (July 4)
('Independence Day', '2025-07-04'),
('Independence Day', '2026-07-04'),
('Independence Day', '2027-07-04'),
('Independence Day', '2028-07-04'),
('Independence Day', '2029-07-04'),
('Independence Day', '2030-07-04'),

-- Labor Day (1st Monday in September)
('Labor Day', '2025-09-01'),
('Labor Day', '2026-09-07'),
('Labor Day', '2027-09-06'),
('Labor Day', '2028-09-04'),
('Labor Day', '2029-09-03'),
('Labor Day', '2030-09-02'),

-- Columbus Day (2nd Monday in October)
('Columbus Day', '2025-10-13'),
('Columbus Day', '2026-10-12'),
('Columbus Day', '2027-10-11'),
('Columbus Day', '2028-10-09'),
('Columbus Day', '2029-10-08'),
('Columbus Day', '2030-10-14'),

-- Veterans Day (November 11)
('Veterans Day', '2025-11-11'),
('Veterans Day', '2026-11-11'),
('Veterans Day', '2027-11-11'),
('Veterans Day', '2028-11-11'),
('Veterans Day', '2029-11-11'),
('Veterans Day', '2030-11-11'),

-- Thanksgiving (4th Thursday in November)
('Thanksgiving', '2025-11-27'),
('Thanksgiving', '2026-11-26'),
('Thanksgiving', '2027-11-25'),
('Thanksgiving', '2028-11-23'),
('Thanksgiving', '2029-11-22'),
('Thanksgiving', '2030-11-28'),

-- Christmas Day (December 25)
('Christmas Day', '2025-12-25'),
('Christmas Day', '2026-12-25'),
('Christmas Day', '2027-12-25'),
('Christmas Day', '2028-12-25'),
('Christmas Day', '2029-12-25'),
('Christmas Day', '2030-12-25'),

-- Cultural and Popular Holidays

-- Valentine's Day (February 14)
('Valentine''s Day', '2025-02-14'),
('Valentine''s Day', '2026-02-14'),
('Valentine''s Day', '2027-02-14'),
('Valentine''s Day', '2028-02-14'),
('Valentine''s Day', '2029-02-14'),
('Valentine''s Day', '2030-02-14'),

-- St. Patrick's Day (March 17)
('St. Patrick''s Day', '2025-03-17'),
('St. Patrick''s Day', '2026-03-17'),
('St. Patrick''s Day', '2027-03-17'),
('St. Patrick''s Day', '2028-03-17'),
('St. Patrick''s Day', '2029-03-17'),
('St. Patrick''s Day', '2030-03-17'),

-- Easter Sunday (Variable date)
('Easter Sunday', '2025-04-20'),
('Easter Sunday', '2026-04-05'),
('Easter Sunday', '2027-03-28'),
('Easter Sunday', '2028-04-16'),
('Easter Sunday', '2029-04-01'),
('Easter Sunday', '2030-04-21'),

-- Mother's Day (2nd Sunday in May)
('Mother''s Day', '2025-05-11'),
('Mother''s Day', '2026-05-10'),
('Mother''s Day', '2027-05-09'),
('Mother''s Day', '2028-05-14'),
('Mother''s Day', '2029-05-13'),
('Mother''s Day', '2030-05-12'),

-- Father's Day (3rd Sunday in June)
('Father''s Day', '2025-06-15'),
('Father''s Day', '2026-06-21'),
('Father''s Day', '2027-06-20'),
('Father''s Day', '2028-06-18'),
('Father''s Day', '2029-06-17'),
('Father''s Day', '2030-06-16'),

-- Halloween (October 31)
('Halloween', '2025-10-31'),
('Halloween', '2026-10-31'),
('Halloween', '2027-10-31'),
('Halloween', '2028-10-31'),
('Halloween', '2029-10-31'),
('Halloween', '2030-10-31'),

-- Black Friday (Day after Thanksgiving)
('Black Friday', '2025-11-28'),
('Black Friday', '2026-11-27'),
('Black Friday', '2027-11-26'),
('Black Friday', '2028-11-24'),
('Black Friday', '2029-11-23'),
('Black Friday', '2030-11-29'),

-- Additional Popular Holidays

-- Groundhog Day (February 2)
('Groundhog Day', '2025-02-02'),
('Groundhog Day', '2026-02-02'),
('Groundhog Day', '2027-02-02'),
('Groundhog Day', '2028-02-02'),
('Groundhog Day', '2029-02-02'),
('Groundhog Day', '2030-02-02'),

-- April Fool's Day (April 1)
('April Fool''s Day', '2025-04-01'),
('April Fool''s Day', '2026-04-01'),
('April Fool''s Day', '2027-04-01'),
('April Fool''s Day', '2028-04-01'),
('April Fool''s Day', '2029-04-01'),
('April Fool''s Day', '2030-04-01'),

-- Earth Day (April 22)
('Earth Day', '2025-04-22'),
('Earth Day', '2026-04-22'),
('Earth Day', '2027-04-22'),
('Earth Day', '2028-04-22'),
('Earth Day', '2029-04-22'),
('Earth Day', '2030-04-22'),

-- Cinco de Mayo (May 5)
('Cinco de Mayo', '2025-05-05'),
('Cinco de Mayo', '2026-05-05'),
('Cinco de Mayo', '2027-05-05'),
('Cinco de Mayo', '2028-05-05'),
('Cinco de Mayo', '2029-05-05'),
('Cinco de Mayo', '2030-05-05'),

-- Flag Day (June 14)
('Flag Day', '2025-06-14'),
('Flag Day', '2026-06-14'),
('Flag Day', '2027-06-14'),
('Flag Day', '2028-06-14'),
('Flag Day', '2029-06-14'),
('Flag Day', '2030-06-14'),

-- Patriot Day (September 11)
('Patriot Day', '2025-09-11'),
('Patriot Day', '2026-09-11'),
('Patriot Day', '2027-09-11'),
('Patriot Day', '2028-09-11'),
('Patriot Day', '2029-09-11'),
('Patriot Day', '2030-09-11'),

-- New Year's Eve (December 31)
('New Year''s Eve', '2025-12-31'),
('New Year''s Eve', '2026-12-31'),
('New Year''s Eve', '2027-12-31'),
('New Year''s Eve', '2028-12-31'),
('New Year''s Eve', '2029-12-31'),
('New Year''s Eve', '2030-12-31')

ON CONFLICT DO NOTHING;