-- ============================================================
-- Purpose : Create the 4 gift card catalog tables in the ds schema
-- Date    : 2026-05-26
-- Tables  : ds.tbl_gcp_pools
--           ds.tbl_gcr_reasons
--           ds.tbl_gct_card_types
--           ds.tbl_gcv_card_values
-- Notes   : All scripts are idempotent (IF NOT EXISTS guards).
--           Soft-delete via <prefix>_is_active = FALSE — no DELETE.
--           created_by references ds.tbl_users.usr_id.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Pools
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.tbl_gcp_pools (
  gcp_id         SERIAL PRIMARY KEY,
  gcp_code       VARCHAR(50)  NOT NULL UNIQUE,
  gcp_name       VARCHAR(200) NOT NULL,
  gcp_is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  gcp_created_by INTEGER      NOT NULL REFERENCES ds.tbl_users(usr_id),
  gcp_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_gcp_pools_is_active
  ON ds.tbl_gcp_pools (gcp_is_active);

CREATE INDEX IF NOT EXISTS idx_tbl_gcp_pools_created_by
  ON ds.tbl_gcp_pools (gcp_created_by);


-- ------------------------------------------------------------
-- 2. Reasons
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.tbl_gcr_reasons (
  gcr_id         SERIAL PRIMARY KEY,
  gcr_name       VARCHAR(200) NOT NULL UNIQUE,
  gcr_is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  gcr_created_by INTEGER      NOT NULL REFERENCES ds.tbl_users(usr_id),
  gcr_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_gcr_reasons_is_active
  ON ds.tbl_gcr_reasons (gcr_is_active);

CREATE INDEX IF NOT EXISTS idx_tbl_gcr_reasons_created_by
  ON ds.tbl_gcr_reasons (gcr_created_by);


-- ------------------------------------------------------------
-- 3. Card Types
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.tbl_gct_card_types (
  gct_id         SERIAL PRIMARY KEY,
  gct_name       VARCHAR(200) NOT NULL UNIQUE,
  gct_is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  gct_created_by INTEGER      NOT NULL REFERENCES ds.tbl_users(usr_id),
  gct_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_gct_card_types_is_active
  ON ds.tbl_gct_card_types (gct_is_active);

CREATE INDEX IF NOT EXISTS idx_tbl_gct_card_types_created_by
  ON ds.tbl_gct_card_types (gct_created_by);


-- ------------------------------------------------------------
-- 4. Card Values  (FK to Card Types — Story 5 depends on this)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ds.tbl_gcv_card_values (
  gcv_id         SERIAL PRIMARY KEY,
  gct_id         INTEGER        NOT NULL REFERENCES ds.tbl_gct_card_types(gct_id),
  gcv_amount     NUMERIC(15, 2) NOT NULL,
  gcv_currency   VARCHAR(10)    NOT NULL DEFAULT 'USD',
  gcv_is_active  BOOLEAN        NOT NULL DEFAULT TRUE,
  gcv_created_by INTEGER        NOT NULL REFERENCES ds.tbl_users(usr_id),
  gcv_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_gcv_card_values_gct_id
  ON ds.tbl_gcv_card_values (gct_id);

CREATE INDEX IF NOT EXISTS idx_tbl_gcv_card_values_is_active
  ON ds.tbl_gcv_card_values (gcv_is_active);

CREATE INDEX IF NOT EXISTS idx_tbl_gcv_card_values_created_by
  ON ds.tbl_gcv_card_values (gcv_created_by);
