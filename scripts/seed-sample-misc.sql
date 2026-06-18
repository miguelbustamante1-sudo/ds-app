-- Miscelaneos: Client Contacts, Task Comments
-- Idempotente: guards por unicidad de cada tabla

-- ── Client Contacts ───────────────────────────────────────────────────────────
-- cli_id 1 = TELUS International, 2 = Mastercard, 3 = Charter, 4 = Dolby (seeded en seed.sql)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cco_client_contact WHERE cco_email = 'jsmith@telus.com') THEN
    INSERT INTO ds.cco_client_contact(cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
    VALUES (1, 'John Smith', 'jsmith@telus.com', '+1-604-555-0101', 'Account Manager', TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cco_client_contact WHERE cco_email = 'amartinez@telus.com') THEN
    INSERT INTO ds.cco_client_contact(cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
    VALUES (1, 'Ana Martinez', 'amartinez@telus.com', '+1-604-555-0102', 'Technical Lead', TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cco_client_contact WHERE cco_email = 'bjohnson@mastercard.com') THEN
    INSERT INTO ds.cco_client_contact(cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
    VALUES (2, 'Brian Johnson', 'bjohnson@mastercard.com', '+1-914-555-0201', 'Project Manager', TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cco_client_contact WHERE cco_email = 'lwilson@charter.com') THEN
    INSERT INTO ds.cco_client_contact(cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
    VALUES (3, 'Laura Wilson', 'lwilson@charter.com', '+1-203-555-0301', 'Director of Engineering', TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM ds.cco_client_contact WHERE cco_email = 'rchen@dolby.com') THEN
    INSERT INTO ds.cco_client_contact(cli_id, cco_name, cco_email, cco_phone_number, cco_position, cco_active)
    VALUES (4, 'Robert Chen', 'rchen@dolby.com', '+1-408-555-0401', 'VP Engineering', TRUE);
  END IF;
END $$;
