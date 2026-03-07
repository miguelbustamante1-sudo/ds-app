-- This script runs automatically when the local Postgres container starts for the first time.
-- It creates the schemas required by the Prisma schema.

CREATE SCHEMA IF NOT EXISTS ds;
CREATE SCHEMA IF NOT EXISTS sec;
CREATE SCHEMA IF NOT EXISTS com;
CREATE SCHEMA IF NOT EXISTS es;
