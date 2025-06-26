/*
  # Add Juneteenth to Holiday System

  1. New Holiday Addition
    - Add Juneteenth (June 19) as a federal holiday
    - Include entries for 2025-2030 to match existing holiday coverage
    - Juneteenth became a federal holiday in 2021

  2. Holiday Information
    - Date: June 19th annually
    - Official name: "Juneteenth National Independence Day"
    - Commonly known as: "Juneteenth"
    - Significance: Commemorates the end of slavery in the United States
*/

-- Add Juneteenth for 2025-2030 to match existing holiday coverage
INSERT INTO holidays (name, date) VALUES 
-- Juneteenth (June 19)
('Juneteenth', '2025-06-19'),
('Juneteenth', '2026-06-19'),
('Juneteenth', '2027-06-19'),
('Juneteenth', '2028-06-19'),
('Juneteenth', '2029-06-19'),
('Juneteenth', '2030-06-19')

ON CONFLICT DO NOTHING;

-- Log the addition
DO $$
DECLARE
    juneteenth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO juneteenth_count 
    FROM holidays 
    WHERE name = 'Juneteenth';
    
    RAISE LOG 'Juneteenth holiday entries: % records added/verified', juneteenth_count;
    
    IF juneteenth_count >= 6 THEN
        RAISE LOG 'SUCCESS: Juneteenth has been added to the holiday system for 2025-2030';
    ELSE
        RAISE LOG 'WARNING: Expected 6 Juneteenth entries, found %', juneteenth_count;
    END IF;
END $$;