-- Phase 2 migration
-- Run this ONCE against your existing DB before deploying Phase 2.
--
-- docker exec -it money_manager_db psql -U mmuser -d money_manager -f /migration-phase2.sql
--
-- Safe to run multiple times (IF NOT EXISTS guards).

-- Unique constraint on transactions so ON CONFLICT (date, merchant_raw, amount, debit_credit, bank)
-- works correctly in upload.js — prevents duplicate imports of the same statement.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS uq_transaction_identity;

ALTER TABLE transactions
  ADD CONSTRAINT uq_transaction_identity
  UNIQUE (date, merchant_raw, amount, debit_credit, bank);
