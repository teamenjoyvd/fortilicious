-- supabase/migrations/20260602000004_phase5_status_enum.sql
-- ROLLBACK: -- cannot easily remove enum value in standard postgres migration; ignored or handled by restoration.

-- ALTER TYPE content_piece_status ADD VALUE cannot be executed in a multi-statement transaction in Postgres.
-- Keeping this in its own migration file enables isolated execution.
ALTER TYPE content_piece_status ADD VALUE IF NOT EXISTS 'scheduled';
