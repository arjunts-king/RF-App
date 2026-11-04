-- =========================================================================
-- Seafood Purchase Management System — PostgreSQL / Supabase Production Schema
-- Comprehensive Schema Synchronized with TypeScript Domain Models
-- Referential Integrity, Secondary Indexes, Audit Logging, and RBAC / RLS Policies
-- =========================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- SECTION 1: MASTER DATA ENTITIES
-- =========================================================================

-- 1. Business Settings
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(50),
    pan VARCHAR(50),
    financial_year_start_month INT DEFAULT 4 CHECK (financial_year_start_month BETWEEN 1 AND 12),
    default_credit_days INT DEFAULT 30 CHECK (default_credit_days >= 0),
    currency_symbol VARCHAR(10) DEFAULT '₹',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. System Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'master_accountant', 'junior_accountant', 'viewer')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Suppliers Master Table
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

-- 4. Species / Product Master Table
CREATE TABLE IF NOT EXISTS species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    product_form VARCHAR(50),
    processing_type VARCHAR(50),
    hs_code VARCHAR(50),
    raw_species_name VARCHAR(255),
    raw_species_id UUID REFERENCES species(id) ON DELETE SET NULL,
    inventory_quantity_basis VARCHAR(50) DEFAULT 'purchase_weight',
    inventory_item_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Grades Master Table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    applies_to_species_id UUID REFERENCES species(id) ON DELETE RESTRICT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sizes Master Table
CREATE TABLE IF NOT EXISTS sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    applies_to_species_id UUID REFERENCES species(id) ON DELETE RESTRICT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Counts Master Table
CREATE TABLE IF NOT EXISTS counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchase Locations Master Table
CREATE TABLE IF NOT EXISTS purchase_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(100),
    type VARCHAR(50) DEFAULT 'Harbour' CHECK (type IN ('Harbour', 'Landing Center', 'Farm', 'Cold Storage', 'Other')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Company Bank Accounts Master Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(100) UNIQUE NOT NULL,
    ifsc VARCHAR(50) NOT NULL,
    branch VARCHAR(100),
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Direct Landing Expense Types Master
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_rate_type VARCHAR(50) DEFAULT 'per_kg' CHECK (default_rate_type IN ('per_kg', 'lump_sum', 'per_box')),
    default_rate DECIMAL(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Slab Types Master Table
CREATE TABLE IF NOT EXISTS slab_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    standard_weight_kg DECIMAL(10,2) NOT NULL CHECK (standard_weight_kg > 0),
    unit VARCHAR(20) DEFAULT 'Kg',
    product_applicability VARCHAR(100) DEFAULT 'All Products',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Customers Master Table (Export Buyers & Domestic Consignees)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    country VARCHAR(100) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_id VARCHAR(100),
    bank_details TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Port Masters Table (Commercial Logistics)
CREATE TABLE IF NOT EXISTS port_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SECTION 2: PROCUREMENT & HARBOUR PURCHASES
-- =========================================================================

-- 14. Purchases Core Register Table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    lot_serial_no INT NOT NULL,
    batch_no VARCHAR(50) NOT NULL,
    invoice_no VARCHAR(100),
    
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES purchase_locations(id) ON DELETE RESTRICT,
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    size_id UUID NOT NULL REFERENCES sizes(id) ON DELETE RESTRICT,
    count_id UUID REFERENCES counts(id) ON DELETE SET NULL,
    secondary_size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    is_dual_size BOOLEAN DEFAULT FALSE,
    
    boxes_count INT DEFAULT 0 CHECK (boxes_count >= 0),
    weight_kg DECIMAL(12,2) NOT NULL CHECK (weight_kg > 0),
    rate_per_kg DECIMAL(12,2) NOT NULL CHECK (rate_per_kg >= 0),
    purchase_value DECIMAL(15,2) GENERATED ALWAYS AS (weight_kg * rate_per_kg) STORED,
    
    yield_weight_kg DECIMAL(12,2),
    yield_pct DECIMAL(5,2),
    batch_yield_weight_kg DECIMAL(12,2),
    batch_yield_pct DECIMAL(5,2),
    is_batch_yield_allocated BOOLEAN DEFAULT FALSE,
    damage_weight_kg DECIMAL(12,2) DEFAULT 0.00,
    damage_rate_per_kg DECIMAL(12,2) DEFAULT 0.00,
    
    expense_breakdown JSONB DEFAULT '{}'::jsonb,
    total_expenses DECIMAL(15,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) NOT NULL,
    effective_rate_per_kg DECIMAL(12,2) NOT NULL,
    
    credit_days INT DEFAULT 0,
    due_date DATE,
    paid_from_account_id UUID REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount_paid DECIMAL(15,2) DEFAULT 0.00,
    direct_amount_paid DECIMAL(15,2) DEFAULT 0.00,
    balance_payable DECIMAL(15,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid', 'Fully Paid')),
    
    photo_url TEXT,
    remarks TEXT,
    
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    voided_by VARCHAR(255),
    voided_at TIMESTAMPTZ,
    
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Standalone Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_no VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
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

-- 16. Purchase Returns / Debit Notes
CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_no VARCHAR(50) UNIQUE NOT NULL,
    return_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    purchase_ref_no VARCHAR(50),
    invoice_no VARCHAR(100),
    species_id UUID REFERENCES species(id) ON DELETE RESTRICT,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    count_id UUID REFERENCES counts(id) ON DELETE SET NULL,
    returned_weight_kg DECIMAL(12,2) NOT NULL CHECK (returned_weight_kg > 0),
    rate_per_kg DECIMAL(12,2) NOT NULL CHECK (rate_per_kg >= 0),
    returned_value DECIMAL(15,2) GENERATED ALWAYS AS (returned_weight_kg * rate_per_kg) STORED,
    boxes_count INT DEFAULT 0,
    reason VARCHAR(100),
    detailed_reason TEXT,
    adjust_supplier_payable BOOLEAN DEFAULT TRUE,
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    voided_by VARCHAR(255),
    voided_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SECTION 3: FACTORY FLOOR & PRODUCTION LEDGER
-- =========================================================================

-- 17. Daily Processing Entries
CREATE TABLE IF NOT EXISTS daily_processing_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_no VARCHAR(50) UNIQUE NOT NULL,
    processing_date DATE NOT NULL,
    shift VARCHAR(100) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    count_id UUID REFERENCES counts(id) ON DELETE SET NULL,
    supplier_box_id VARCHAR(100) NOT NULL,
    slab_type_id UUID NOT NULL REFERENCES slab_types(id) ON DELETE RESTRICT,
    standard_slab_weight_kg DECIMAL(10,2) NOT NULL,
    slabs_count INT NOT NULL CHECK (slabs_count >= 0),
    processed_weight_kg DECIMAL(12,2) NOT NULL CHECK (processed_weight_kg >= 0),
    rejection_weight_kg DECIMAL(12,2) DEFAULT 0.00,
    expected_weight_kg DECIMAL(12,2) GENERATED ALWAYS AS (slabs_count * standard_slab_weight_kg) STORED,
    variance_weight_kg DECIMAL(12,2) GENERATED ALWAYS AS (processed_weight_kg - (slabs_count * standard_slab_weight_kg)) STORED,
    has_slab_variance BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    operator VARCHAR(255) NOT NULL,
    data_entry_date TIMESTAMPTZ DEFAULT NOW(),
    month_year VARCHAR(7) NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    voided_by VARCHAR(255),
    voided_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SECTION 4: COMMERCIAL SALES & EXPORT INVOICING
-- =========================================================================

-- 18. Sales Invoices Master
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    consignee_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    buyer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_no VARCHAR(100),
    order_date DATE,
    port_of_loading_id UUID NOT NULL REFERENCES port_masters(id) ON DELETE RESTRICT,
    port_of_discharge_id UUID NOT NULL REFERENCES port_masters(id) ON DELETE RESTRICT,
    final_destination_id UUID NOT NULL REFERENCES port_masters(id) ON DELETE RESTRICT,
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,4) NOT NULL CHECK (exchange_rate > 0),
    remarks TEXT,
    total_cartons INT DEFAULT 0,
    total_weight_kg DECIMAL(12,2) DEFAULT 0.00,
    total_amount_currency DECIMAL(15,2) DEFAULT 0.00,
    total_fob_value_currency DECIMAL(15,2) DEFAULT 0.00,
    estimated_amount_inr DECIMAL(15,2) DEFAULT 0.00,
    total_realized_currency DECIMAL(15,2) DEFAULT 0.00,
    balance_realization_currency DECIMAL(15,2) DEFAULT 0.00,
    total_realized_inr DECIMAL(15,2) DEFAULT 0.00,
    realization_status VARCHAR(50) DEFAULT 'Not Realized' CHECK (realization_status IN ('Not Realized', 'Partially Realized', 'Fully Realized')),
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    voided_by VARCHAR(255),
    voided_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Sales Invoice Line Items
CREATE TABLE IF NOT EXISTS sales_invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    hs_code VARCHAR(50),
    size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    count_id UUID REFERENCES counts(id) ON DELETE SET NULL,
    cartons_count INT DEFAULT 0,
    weight_kg DECIMAL(12,2) NOT NULL CHECK (weight_kg > 0),
    rate_per_kg DECIMAL(12,2) NOT NULL CHECK (rate_per_kg >= 0),
    amount_currency DECIMAL(15,2) GENERATED ALWAYS AS (weight_kg * rate_per_kg) STORED,
    fob_value_currency DECIMAL(15,2) DEFAULT 0.00,
    product_description TEXT,
    grade_size VARCHAR(50)
);

-- 20. Realization Records (Foreign Currency Receipts & BRC Reconciliation)
CREATE TABLE IF NOT EXISTS realization_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    realization_date DATE NOT NULL,
    amount_currency DECIMAL(15,2) NOT NULL CHECK (amount_currency > 0),
    realized_exchange_rate DECIMAL(10,4) NOT NULL CHECK (realized_exchange_rate > 0),
    amount_inr DECIMAL(15,2) GENERATED ALWAYS AS (amount_currency * realized_exchange_rate) STORED,
    bank_reference VARCHAR(100),
    bank_charges_currency DECIMAL(15,2) DEFAULT 0.00,
    notes TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SECTION 5: INVENTORY PERPETUAL VALUATION & WAC LEDGER
-- =========================================================================

-- 21. Inventory Items Master
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Kg',
    quantity_basis VARCHAR(50) NOT NULL CHECK (quantity_basis IN ('purchase_weight', 'yield')),
    minimum_stock_quantity DECIMAL(12,2) DEFAULT 0.00,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Inventory Item Mappings (Bridge between purchases/sales and inventory items)
CREATE TABLE IF NOT EXISTS inventory_item_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    module VARCHAR(20) NOT NULL CHECK (module IN ('purchase', 'sales')),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    sales_product_id UUID REFERENCES species(id) ON DELETE CASCADE,
    sales_size_id UUID REFERENCES sizes(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Opening Stocks Table
CREATE TABLE IF NOT EXISTS opening_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    quantity_kg DECIMAL(12,2) NOT NULL CHECK (quantity_kg >= 0),
    unit_cost DECIMAL(15,4) NOT NULL CHECK (unit_cost >= 0),
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Stock Adjustments Table
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_no VARCHAR(50) UNIQUE NOT NULL,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    quantity_kg DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(15,4) NOT NULL,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Physical Stock Count Headers
CREATE TABLE IF NOT EXISTS physical_stock_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    count_no VARCHAR(50) UNIQUE NOT NULL,
    count_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted')),
    total_variance_kg DECIMAL(12,2) DEFAULT 0.00,
    total_variance_value DECIMAL(15,2) DEFAULT 0.00,
    counted_by VARCHAR(255) NOT NULL,
    verified_by VARCHAR(255),
    posted_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Physical Stock Count Line Items
CREATE TABLE IF NOT EXISTS physical_stock_count_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    count_id UUID NOT NULL REFERENCES physical_stock_counts(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    system_quantity_kg DECIMAL(12,2) NOT NULL,
    physical_quantity_kg DECIMAL(12,2) NOT NULL,
    variance_kg DECIMAL(12,2) GENERATED ALWAYS AS (physical_quantity_kg - system_quantity_kg) STORED,
    unit_cost DECIMAL(15,4) NOT NULL,
    variance_value DECIMAL(15,2) GENERATED ALWAYS AS ((physical_quantity_kg - system_quantity_kg) * unit_cost) STORED,
    remarks TEXT
);

-- 27. Period Close Locks
CREATE TABLE IF NOT EXISTS period_close_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period VARCHAR(7) UNIQUE NOT NULL, -- YYYY-MM
    closed_at TIMESTAMPTZ NOT NULL,
    closed_by VARCHAR(255) NOT NULL,
    closing_qty DECIMAL(15,3),
    closing_value DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked')),
    reconciliation_passed BOOLEAN DEFAULT TRUE,
    reconciliation_variance_value DECIMAL(15,2) DEFAULT 0.00,
    remarks TEXT
);

-- =========================================================================
-- SECTION 6: SURVEILLANCE & AUDIT LOG
-- =========================================================================

-- 28. Audit / Activity Surveillance Log Table
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

-- =========================================================================
-- SECTION 7: SECONDARY INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- =========================================================================

-- Purchases Table Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_species ON purchases(species_id);
CREATE INDEX IF NOT EXISTS idx_purchases_location ON purchases(location_id);
CREATE INDEX IF NOT EXISTS idx_purchases_grade ON purchases(grade_id);
CREATE INDEX IF NOT EXISTS idx_purchases_size ON purchases(size_id);
CREATE INDEX IF NOT EXISTS idx_purchases_count ON purchases(count_id);
CREATE INDEX IF NOT EXISTS idx_purchases_batch ON purchases(batch_no);
CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_paid_account ON purchases(paid_from_account_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_date_active ON purchases(supplier_id, purchase_date) WHERE is_voided = FALSE;
CREATE INDEX IF NOT EXISTS idx_purchases_ageing ON purchases(due_date, payment_status) WHERE is_voided = FALSE AND balance_payable > 0;

-- Payments Table Indexes
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase ON payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(paid_from_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_date_active ON payments(supplier_id, payment_date) WHERE is_voided = FALSE;

-- Purchase Returns Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON purchase_returns(return_date);

-- Production Entries Indexes
CREATE INDEX IF NOT EXISTS idx_daily_processing_supplier ON daily_processing_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_daily_processing_species ON daily_processing_entries(species_id);
CREATE INDEX IF NOT EXISTS idx_daily_processing_date ON daily_processing_entries(processing_date);
CREATE INDEX IF NOT EXISTS idx_daily_processing_slab ON daily_processing_entries(slab_type_id);

-- Sales & Realization Indexes
CREATE INDEX IF NOT EXISTS idx_sales_invoices_consignee ON sales_invoices(consignee_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_realization ON sales_invoices(realization_status);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice ON sales_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_species ON sales_invoice_lines(species_id);
CREATE INDEX IF NOT EXISTS idx_realization_records_invoice ON realization_records(invoice_id);

-- Inventory & Stock Valuation Indexes
CREATE INDEX IF NOT EXISTS idx_inv_mappings_item ON inventory_item_mappings(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_mappings_species ON inventory_item_mappings(species_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item ON stock_adjustments(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(date);
CREATE INDEX IF NOT EXISTS idx_physical_stock_items_count ON physical_stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_physical_stock_items_item ON physical_stock_count_items(inventory_item_id);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Grades & Sizes Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_grades_species ON grades(applies_to_species_id);
CREATE INDEX IF NOT EXISTS idx_sizes_species ON sizes(applies_to_species_id);

-- =========================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- =========================================================================

-- Helper function to extract user role safely from auth JWT claims
CREATE OR REPLACE FUNCTION auth.current_role() RETURNS text AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role',
    'viewer'
  );
$$ LANGUAGE sql STABLE;

-- 1. Enable Row Level Security across all application tables
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE slab_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_processing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE realization_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_close_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Audit Logs: Strictly isolated to Owner and Admin only (Surveillance isolation)
CREATE POLICY "Audit logs admin access only" ON audit_logs
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin'));

-- 3. Purchases: Read for all authenticated, write for accountants and admin
CREATE POLICY "Purchases select policy" ON purchases
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Purchases insert update policy" ON purchases
  FOR INSERT WITH CHECK (auth.current_role() IN ('owner', 'admin', 'master_accountant', 'junior_accountant'));

CREATE POLICY "Purchases delete policy" ON purchases
  FOR DELETE
  USING (auth.current_role() IN ('owner', 'admin'));

-- 4. Payments: Restricted from junior accountants
CREATE POLICY "Payments read policy" ON payments
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Payments write policy" ON payments
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

-- 5. Production & Factory Entries
CREATE POLICY "Daily processing select policy" ON daily_processing_entries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Daily processing write policy" ON daily_processing_entries
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant', 'junior_accountant'));

-- 6. Sales Invoices & Realizations
CREATE POLICY "Sales invoices select policy" ON sales_invoices
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Sales invoices write policy" ON sales_invoices
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Sales lines policy" ON sales_invoice_lines
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Realization records policy" ON realization_records
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

-- 7. Inventory & Perpetual Valuation
CREATE POLICY "Inventory items select policy" ON inventory_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Inventory items write policy" ON inventory_items
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Inventory mappings policy" ON inventory_item_mappings
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Stock adjustments policy" ON stock_adjustments
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Period close locks policy" ON period_close_locks
  FOR ALL
  USING (auth.current_role() IN ('owner', 'admin'));

-- 8. Master Data Tables (Read for all authenticated, write for admin/master_accountant)
CREATE POLICY "Suppliers read policy" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Suppliers write policy" ON suppliers FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Species read policy" ON species FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Species write policy" ON species FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Customers read policy" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Customers write policy" ON customers FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Settings read policy" ON business_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Settings write policy" ON business_settings FOR ALL USING (auth.current_role() IN ('owner', 'admin'));

-- 9. Purchase Returns
CREATE POLICY "Purchase returns select policy" ON purchase_returns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Purchase returns write policy" ON purchase_returns FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant', 'junior_accountant'));

-- 10. Master Reference Tables (Grades, Sizes, Counts, Locations, Bank Accounts, Expenses, Slab Types, Ports)
CREATE POLICY "Grades read policy" ON grades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Grades write policy" ON grades FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Sizes read policy" ON sizes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Sizes write policy" ON sizes FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Counts read policy" ON counts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Counts write policy" ON counts FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Purchase locations read policy" ON purchase_locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Purchase locations write policy" ON purchase_locations FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Bank accounts read policy" ON bank_accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Bank accounts write policy" ON bank_accounts FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Expense types read policy" ON expense_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Expense types write policy" ON expense_types FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Slab types read policy" ON slab_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Slab types write policy" ON slab_types FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Port masters read policy" ON port_masters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Port masters write policy" ON port_masters FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

-- 11. Core Inventory Tables (Opening Stocks, Physical Stock Counts)
CREATE POLICY "Opening stocks read policy" ON opening_stocks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Opening stocks write policy" ON opening_stocks FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Physical stock counts read policy" ON physical_stock_counts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Physical stock counts write policy" ON physical_stock_counts FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

CREATE POLICY "Physical stock count items read policy" ON physical_stock_count_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Physical stock count items write policy" ON physical_stock_count_items FOR ALL USING (auth.current_role() IN ('owner', 'admin', 'master_accountant'));

-- 12. User Management
CREATE POLICY "Users read policy" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users write policy" ON users FOR ALL USING (auth.current_role() IN ('owner', 'admin'));

