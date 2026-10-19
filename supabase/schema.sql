-- =========================================================================
-- Seafood Purchase Management System — PostgreSQL / Supabase Production Schema
-- Referential integrity, Foreign Keys, Audit Logging, and RBAC Policies
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suppliers Master Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('boat_owner', 'auctioneer_agent', 'trader', 'farm', 'other')),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    district VARCHAR(100),
    state VARCHAR(100),
    gstin VARCHAR(20),
    pan VARCHAR(20),
    bank_name VARCHAR(150),
    bank_account VARCHAR(100),
    bank_ifsc VARCHAR(50),
    payment_terms TEXT,
    credit_days INT DEFAULT 0 CHECK (credit_days >= 0),
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Species / Product Master Table
CREATE TABLE IF NOT EXISTS species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grades Master Table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    applies_to_species_id UUID REFERENCES species(id) ON DELETE RESTRICT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sizes / Counts Master Table
CREATE TABLE IF NOT EXISTS sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., '16/20', '21/25', '26/30'
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Purchase Locations Master Table
CREATE TABLE IF NOT EXISTS purchase_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    harbour_centre VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bank / Cash Accounts Master Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    bank VARCHAR(150),
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Current', 'Savings', 'Cash Float')),
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Expense Types Master Table (Dynamic, user-extensible)
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) DEFAULT 'Direct Purchase Expense',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchase Transactions
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id VARCHAR(50) UNIQUE NOT NULL, -- sequential PUR-00001
    purchase_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL, -- e.g. FY 2026-27
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES purchase_locations(id) ON DELETE RESTRICT,
    invoice_no VARCHAR(100),
    batch_no VARCHAR(100), -- shared cost pool batch identifier
    
    -- Product details
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    boxes_count INT DEFAULT 0 CHECK (boxes_count >= 0),
    weight_kg DECIMAL(12,2) NOT NULL CHECK (weight_kg > 0),
    rate_per_kg DECIMAL(12,2) NOT NULL CHECK (rate_per_kg >= 0),
    
    -- Calculated pricing & damages
    purchase_value DECIMAL(15,2) GENERATED ALWAYS AS (weight_kg * rate_per_kg) STORED,
    damage_weight_kg DECIMAL(12,2) DEFAULT 0.00 CHECK (damage_weight_kg >= 0),
    damage_rate_per_kg DECIMAL(12,2) DEFAULT 0.00 CHECK (damage_rate_per_kg >= 0),
    damage_amount DECIMAL(15,2) GENERATED ALWAYS AS (damage_weight_kg * damage_rate_per_kg) STORED,
    gross_purchase_value DECIMAL(15,2) GENERATED ALWAYS AS ((weight_kg * rate_per_kg) - (damage_weight_kg * damage_rate_per_kg)) STORED,
    
    -- Expenses
    expense_breakdown JSONB DEFAULT '{}'::jsonb, -- dynamic active expense heads
    total_expenses DECIMAL(15,2) DEFAULT 0.00,
    is_batch_allocated BOOLEAN DEFAULT FALSE,
    total_cost DECIMAL(15,2) NOT NULL, -- gross_purchase_value + total_expenses
    effective_rate_per_kg DECIMAL(12,2) NOT NULL, -- total_cost / weight_kg
    
    -- Payment state
    direct_amount_paid DECIMAL(15,2) DEFAULT 0.00,
    amount_paid DECIMAL(15,2) DEFAULT 0.00,
    payment_date DATE,
    paid_from_account_id UUID REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    balance_payable DECIMAL(15,2) NOT NULL, -- total_cost - amount_paid
    due_date DATE NOT NULL,
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Fully Paid')),
    
    -- Additional fields
    rejection_weight_kg DECIMAL(12,2) DEFAULT 0.00,
    remarks TEXT,
    photo_attachment_url TEXT,
    
    -- Soft-delete / Void
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    voided_by VARCHAR(255),
    voided_at TIMESTAMPTZ,
    
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries across thousands of rows
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_species ON purchases(species_id);
CREATE INDEX IF NOT EXISTS idx_purchases_batch ON purchases(batch_no);
CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date);

-- 9. Standalone Payments Table (for Lump-sum Payments on Account)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_no VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL, -- specific purchase allocation or NULL for FIFO pool
    paid_from_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
    reference_no VARCHAR(100),
    notes TEXT,
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit / Surveillance Log (Restricted to Owner/Admin ONLY)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('LOGIN', 'CREATE', 'EDIT', 'VOID', 'DELETE')),
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_email);
