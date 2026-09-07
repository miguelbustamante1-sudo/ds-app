-- Purpose: Add gci_pin and gci_assigned_id columns to es.gci_gift_card_inventory
-- Date: 2026-07-09
-- Table: es.gci_gift_card_inventory
-- Author: Generated for Marjorie Monson — retrospective gap FR-06, FR-07

DO $$
BEGIN
  -- gci_pin: card PIN / redemption secret uploaded by Carmen via CSV
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'es' AND table_name = 'gci_gift_card_inventory' AND column_name = 'gci_pin'
  ) THEN
    ALTER TABLE es.gci_gift_card_inventory ADD COLUMN gci_pin TEXT NULL;
  END IF;

  -- gci_assigned_id: written by the system after authorization and email delivery
  -- NULL = card is available for selection
  -- NOT NULL = card has been consumed by the referenced assignment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'es' AND table_name = 'gci_gift_card_inventory' AND column_name = 'gci_assigned_id'
  ) THEN
    ALTER TABLE es.gci_gift_card_inventory ADD COLUMN gci_assigned_id INTEGER NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gci_assigned_id
  ON es.gci_gift_card_inventory (gci_assigned_id);

CREATE INDEX IF NOT EXISTS idx_gci_expiracion
  ON es.gci_gift_card_inventory (gci_expiracion);
