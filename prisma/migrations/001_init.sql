-- EqualPay: PostgreSQL Production Schema & Data Pipeline Migration
-- Database: PostgreSQL 14+ / Supabase / Neon / Cloud SQL

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE split_type AS ENUM ('EQUAL', 'PERCENTAGE', 'EXACT_AMOUNT', 'SHARES', 'ITEMIZED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE group_category AS ENUM ('Trip', 'Home', 'Flat/Rent', 'Event', 'Office', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE settlement_method AS ENUM ('UPI', 'PayPal', 'Stripe', 'Venmo', 'Cash', 'Bank Transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sync_operation AS ENUM ('CREATE_EXPENSE', 'UPDATE_EXPENSE', 'DELETE_EXPENSE', 'CREATE_GROUP', 'UPDATE_GROUP', 'SETTLE_DEBT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    base_currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    whatsapp_enabled BOOLEAN DEFAULT true NOT NULL,
    sms_enabled BOOLEAN DEFAULT false NOT NULL,
    push_enabled BOOLEAN DEFAULT true NOT NULL,
    email_digest BOOLEAN DEFAULT true NOT NULL,
    reminder_frequency VARCHAR(20) DEFAULT 'weekly' NOT NULL
);

-- 5. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(160) NOT NULL,
    category group_category DEFAULT 'Trip' NOT NULL,
    default_currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    description TEXT,
    avatar_url VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. GROUP MEMBERSHIPS
CREATE TABLE IF NOT EXISTS group_memberships (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    group_id VARCHAR(64) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_group_membership UNIQUE (group_id, user_id)
);

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    group_id VARCHAR(64) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    paid_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    split_type split_type DEFAULT 'EQUAL' NOT NULL,
    category VARCHAR(60) DEFAULT 'Dining' NOT NULL,
    receipt_url TEXT,
    notes TEXT,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. EXPENSE SPLITS TABLE
CREATE TABLE IF NOT EXISTS expense_splits (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    expense_id VARCHAR(64) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL,
    percentage NUMERIC(6, 2),
    shares INT,
    CONSTRAINT uq_expense_split UNIQUE (expense_id, user_id)
);

-- 9. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS settlements (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    group_id VARCHAR(64) REFERENCES groups(id) ON DELETE SET NULL,
    from_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    to_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    method settlement_method DEFAULT 'UPI' NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. CURRENCY RATES CACHE
CREATE TABLE IF NOT EXISTS currency_rates (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    base_currency VARCHAR(10) NOT NULL,
    target_code VARCHAR(10) NOT NULL,
    rate NUMERIC(18, 6) NOT NULL,
    source VARCHAR(60) DEFAULT 'OpenExchangeRates' NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_base_target UNIQUE (base_currency, target_code)
);

-- 11. SYNC AUDIT LOGS (OFFLINE LWW CONFLICT AUDIT)
CREATE TABLE IF NOT EXISTS sync_audit_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    client_sync_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    operation sync_operation NOT NULL,
    client_time TIMESTAMPTZ NOT NULL,
    server_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    device_origin VARCHAR(20) DEFAULT 'web' NOT NULL,
    status VARCHAR(30) DEFAULT 'APPLIED' NOT NULL
);

-- 12. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_group_memberships_gid ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_uid ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_gid ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_users ON settlements(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_currency_rates_base ON currency_rates(base_currency);
