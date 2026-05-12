-- Money Manager — DB Schema
-- Runs automatically on first docker-compose up

CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  merchant_raw    TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  debit_credit    VARCHAR(6) NOT NULL CHECK (debit_credit IN ('DEBIT', 'CREDIT')),
  bank            VARCHAR(50),
  source_file     TEXT,
  category        VARCHAR(50),
  ai_suggestion   VARCHAR(50),
  ai_confidence   NUMERIC(4,1),
  reviewed        BOOLEAN DEFAULT FALSE,
  is_transfer     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_map (
  id              SERIAL PRIMARY KEY,
  merchant_raw    TEXT UNIQUE NOT NULL,
  category        VARCHAR(50) NOT NULL,
  hit_count       INT DEFAULT 1,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transfers (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  from_bank       VARCHAR(50),
  to_bank         VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, amount, from_bank, to_bank)
);

CREATE TABLE IF NOT EXISTS budgets (
  id              SERIAL PRIMARY KEY,
  month           DATE NOT NULL,
  category        VARCHAR(50) NOT NULL,
  budget_amount   NUMERIC(10,2) NOT NULL,
  UNIQUE(month, category)
);

-- Index for fast merchant lookups (Pass 1 query)
CREATE INDEX IF NOT EXISTS idx_merchant_map_raw ON merchant_map (merchant_raw);

-- Index for daily review queue
CREATE INDEX IF NOT EXISTS idx_transactions_reviewed ON transactions (reviewed, created_at DESC);

-- Index for transfer detection (date + amount grouping)
CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON transactions (date, amount, debit_credit);
