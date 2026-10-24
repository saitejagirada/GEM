-- =============================================================================
-- GeM Mobile Companion App - Production PostgreSQL Supabase Schema
-- Architecture Stream: Thread 4 (Supabase & Realtime Data Pipeline)
-- Includes Reality Checker enhancements: epbg_amount_inr, oem_authorization_required,
-- action_required, and reconfirm_deadline for corrigenda invalidation alerts.
-- =============================================================================

-- Enable standard cryptographic & text indexing extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- 1. TENDERS TABLE (Primary Bid Catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenders (
    bid_number VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    ministry VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    bid_type VARCHAR(32) NOT NULL DEFAULT 'PRODUCT' CHECK (bid_type IN ('PRODUCT', 'SERVICE', 'BOQ', 'CUSTOM', 'RA')),
    category_domain VARCHAR(64) DEFAULT 'General Goods & Supplies',
    estimated_value NUMERIC(15, 2) CHECK (estimated_value >= 0),
    emd_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (emd_amount >= 0),
    emd_exemption_mse BOOLEAN NOT NULL DEFAULT TRUE,
    closing_datetime TIMESTAMPTZ NOT NULL,
    opening_datetime TIMESTAMPTZ,
    boq_summary TEXT,
    consignee_states TEXT[] NOT NULL DEFAULT '{}',
    splitting_ratio VARCHAR(64) DEFAULT '100% to L1',
    make_in_india_class VARCHAR(32) DEFAULT 'CLASS_1' CHECK (make_in_india_class IN ('CLASS_1', 'CLASS_2', 'NON_LOCAL')),
    doc_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- High-performance generated search vector for instant mobile full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(bid_number, '') || ' ' ||
            coalesce(title, '') || ' ' ||
            coalesce(ministry, '') || ' ' ||
            coalesce(department, '') || ' ' ||
            coalesce(boq_summary, '')
        )
    ) STORED
);

-- -----------------------------------------------------------------------------
-- 2. TENDER FUNDAMENTALS TABLE (2x2 Glanceable Cards & Dealbreakers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tender_fundamentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.tenders(bid_number) ON DELETE CASCADE,
    turnover_required NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (turnover_required >= 0),
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    delivery_period_days INTEGER NOT NULL DEFAULT 30 CHECK (delivery_period_days > 0),
    epbg_percentage NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (epbg_percentage >= 0),
    epbg_amount_inr NUMERIC(15, 2) DEFAULT 0.00 CHECK (epbg_amount_inr >= 0),
    oem_authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    past_performance_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (past_performance_percentage >= 0),
    technical_clauses JSONB DEFAULT '[]'::jsonb,
    required_documents TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. REVERSE AUCTIONS TABLE (Live Clock-Drift Synced Price Decrements)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reverse_auctions (
    ra_number VARCHAR(64) PRIMARY KEY,
    original_bid_number VARCHAR(64) REFERENCES public.tenders(bid_number) ON DELETE SET NULL,
    title TEXT NOT NULL,
    buyer_organization VARCHAR(255) NOT NULL,
    closing_time TIMESTAMPTZ NOT NULL,
    current_l1_inr NUMERIC(15, 2) NOT NULL CHECK (current_l1_inr >= 0),
    min_decrement_inr NUMERIC(15, 2) NOT NULL DEFAULT 1000.00 CHECK (min_decrement_inr > 0),
    total_quantity INTEGER NOT NULL DEFAULT 1 CHECK (total_quantity > 0),
    auto_extension_minutes INTEGER NOT NULL DEFAULT 10 CHECK (auto_extension_minutes >= 0),
    is_extended BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXTENDED', 'CLOSED', 'CANCELLED')),
    winner_seller_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 4. CORRIGENDA TABLE (Tender Amendments & Due Date Shifts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corrigenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id VARCHAR(64) NOT NULL REFERENCES public.tenders(bid_number) ON DELETE CASCADE,
    amendment_type VARCHAR(64) NOT NULL CHECK (amendment_type IN (
        'DUE_DATE_EXTENSION',
        'TECHNICAL_SPEC_CHANGE',
        'BOQ_REVISION',
        'QUANTITY_CHANGE',
        'ELIGIBILITY_CRITERIA_MODIFICATION',
        'GENERAL_CLARIFICATION'
    )),
    summary TEXT NOT NULL,
    action_required BOOLEAN NOT NULL DEFAULT TRUE,
    reconfirm_deadline TIMESTAMPTZ,
    previous_closing TIMESTAMPTZ,
    new_closing TIMESTAMPTZ,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 5. VENDOR PROFILES TABLE (Udyam & MSME Matching Profile)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    user_id UUID PRIMARY KEY,
    organization_name TEXT NOT NULL,
    udyam_number VARCHAR(64) UNIQUE,
    enterprise_type VARCHAR(32) NOT NULL DEFAULT 'MICRO' CHECK (enterprise_type IN ('MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'STARTUP')),
    annual_turnover NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (annual_turnover >= 0),
    years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
    target_categories TEXT[] NOT NULL DEFAULT '{}',
    state VARCHAR(64) NOT NULL,
    is_oem BOOLEAN NOT NULL DEFAULT FALSE,
    biometric_auth_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 6. VENDOR PORTFOLIO TABLE (Participated Bids, PFMS & CRAC Tracker)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.vendor_profiles(user_id) ON DELETE CASCADE,
    bid_number VARCHAR(64) NOT NULL REFERENCES public.tenders(bid_number) ON DELETE CASCADE,
    status VARCHAR(64) NOT NULL DEFAULT 'TECHNICAL_EVALUATION' CHECK (status IN (
        'TECHNICAL_EVALUATION',
        'FINANCIAL_EVALUATION',
        'REVERSE_AUCTION',
        'AWARDED_L1',
        'DISQUALIFIED',
        'CANCELLED'
    )),
    quoted_l1 NUMERIC(15, 2) NOT NULL CHECK (quoted_l1 >= 0),
    expected_l1_benchmark NUMERIC(15, 2) CHECK (expected_l1_benchmark >= 0),
    current_rank INTEGER DEFAULT 1 CHECK (current_rank > 0),
    pfms_stage VARCHAR(64) DEFAULT 'ORDER_PLACED' CHECK (pfms_stage IN (
        'ORDER_PLACED',
        'DISPATCHED',
        'PRC_ISSUED',
        'CRAC_APPROVED',
        'PFMS_TREASURY_SANCTION',
        'BANK_UTR_CREDITED'
    )),
    crac_status VARCHAR(32) DEFAULT 'PENDING' CHECK (crac_status IN (
        'PENDING',
        'IN_PROGRESS',
        'ACCEPTED',
        'REJECTED',
        'PROVISIONAL_PRC'
    )),
    contract_number VARCHAR(64),
    invoice_number VARCHAR(64),
    pfms_utr_number VARCHAR(64),
    sla_compliance VARCHAR(64) DEFAULT 'ON_TIME',
    order_date TIMESTAMPTZ,
    crac_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, bid_number)
);

-- =============================================================================
-- INDEXING OPTIMIZATIONS
-- =============================================================================

-- GIN Indexes for Instant Mobile Full-Text & Array Matching
CREATE INDEX IF NOT EXISTS idx_tenders_search_vector 
    ON public.tenders USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_tenders_consignee_states 
    ON public.tenders USING GIN (consignee_states);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_categories 
    ON public.vendor_profiles USING GIN (target_categories);

-- B-Tree Indexes for Critical Date Orderings & Fast Filtering
CREATE INDEX IF NOT EXISTS idx_tenders_closing_datetime 
    ON public.tenders (closing_datetime ASC);

CREATE INDEX IF NOT EXISTS idx_tenders_opening_datetime 
    ON public.tenders (opening_datetime ASC);

CREATE INDEX IF NOT EXISTS idx_tenders_ministry_dept 
    ON public.tenders (ministry, department);

CREATE INDEX IF NOT EXISTS idx_ra_closing_time 
    ON public.reverse_auctions (closing_time ASC) 
    WHERE status IN ('ACTIVE', 'EXTENDED');

CREATE INDEX IF NOT EXISTS idx_corrigenda_published_at 
    ON public.corrigenda (published_at DESC, tender_id);

CREATE INDEX IF NOT EXISTS idx_corrigenda_reconfirm_deadline 
    ON public.corrigenda (reconfirm_deadline ASC) 
    WHERE action_required = TRUE;

CREATE INDEX IF NOT EXISTS idx_vendor_portfolio_user_status 
    ON public.vendor_portfolio (user_id, status);

CREATE INDEX IF NOT EXISTS idx_fundamentals_tender_id 
    ON public.tender_fundamentals (tender_id);

-- =============================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenders_updated_at ON public.tenders;
CREATE TRIGGER trigger_tenders_updated_at
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tender_fundamentals_updated_at ON public.tender_fundamentals;
CREATE TRIGGER trigger_tender_fundamentals_updated_at
    BEFORE UPDATE ON public.tender_fundamentals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_reverse_auctions_updated_at ON public.reverse_auctions;
CREATE TRIGGER trigger_reverse_auctions_updated_at
    BEFORE UPDATE ON public.reverse_auctions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_vendor_profiles_updated_at ON public.vendor_profiles;
CREATE TRIGGER trigger_vendor_profiles_updated_at
    BEFORE UPDATE ON public.vendor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_vendor_portfolio_updated_at ON public.vendor_portfolio;
CREATE TRIGGER trigger_vendor_portfolio_updated_at
    BEFORE UPDATE ON public.vendor_portfolio
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_fundamentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reverse_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrigenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portfolio ENABLE ROW LEVEL SECURITY;

-- 1. Public Read for Open Government Tenders & Reverse Auctions
DROP POLICY IF EXISTS "Public tenders are viewable by all" ON public.tenders;
CREATE POLICY "Public tenders are viewable by all"
    ON public.tenders FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public fundamentals are viewable by all" ON public.tender_fundamentals;
CREATE POLICY "Public fundamentals are viewable by all"
    ON public.tender_fundamentals FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public reverse auctions are viewable by all" ON public.reverse_auctions;
CREATE POLICY "Public reverse auctions are viewable by all"
    ON public.reverse_auctions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public corrigenda are viewable by all" ON public.corrigenda;
CREATE POLICY "Public corrigenda are viewable by all"
    ON public.corrigenda FOR SELECT
    USING (true);

-- 1b. Public Crawler & Ingestion Policies for Live Government Bids
DROP POLICY IF EXISTS "Public can insert live tenders" ON public.tenders;
CREATE POLICY "Public can insert live tenders"
    ON public.tenders FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update live tenders" ON public.tenders;
CREATE POLICY "Public can update live tenders"
    ON public.tenders FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Public can insert live fundamentals" ON public.tender_fundamentals;
CREATE POLICY "Public can insert live fundamentals"
    ON public.tender_fundamentals FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update live fundamentals" ON public.tender_fundamentals;
CREATE POLICY "Public can update live fundamentals"
    ON public.tender_fundamentals FOR UPDATE
    USING (true);

-- 2. Authenticated Vendor Profile Isolation
DROP POLICY IF EXISTS "Vendors can view their own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can view their own profile"
    ON public.vendor_profiles FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Vendors can update their own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update their own profile"
    ON public.vendor_profiles FOR UPDATE
    USING (auth.uid() = user_id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Vendors can insert their own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can insert their own profile"
    ON public.vendor_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 3. Authenticated Vendor Portfolio Isolation
DROP POLICY IF EXISTS "Vendors can view their own portfolio" ON public.vendor_portfolio;
CREATE POLICY "Vendors can view their own portfolio"
    ON public.vendor_portfolio FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Vendors can manage their own portfolio" ON public.vendor_portfolio;
CREATE POLICY "Vendors can manage their own portfolio"
    ON public.vendor_portfolio FOR ALL
    USING (auth.uid() = user_id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- =============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- =============================================================================
-- Enable full replication identity so Realtime receives full payloads on UPDATE/DELETE
ALTER TABLE public.reverse_auctions REPLICA IDENTITY FULL;
ALTER TABLE public.corrigenda REPLICA IDENTITY FULL;
ALTER TABLE public.tenders REPLICA IDENTITY FULL;

-- Add live-updating tables to the default Supabase realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reverse_auctions, public.corrigenda;
    END IF;
END $$;

-- =============================================================================
-- PRODUCTION SEED DATA (Synchronized with companion_app/fixtures/mockData.ts)
-- =============================================================================

INSERT INTO public.tenders (
    bid_number, title, ministry, department, bid_type, estimated_value, emd_amount, 
    emd_exemption_mse, closing_datetime, opening_datetime, boq_summary, consignee_states, 
    splitting_ratio, make_in_india_class, doc_url
) VALUES
(
    'GEM/2026/B/89012',
    'High-Efficiency Commercial LED Luminaires 45W & Fixtures',
    'Ministry of Defence',
    'Military Engineer Services (MES)',
    'PRODUCT',
    2850000.00,
    57000.00,
    TRUE,
    timezone('utc'::text, now() + interval '14 hours 22 minutes'),
    timezone('utc'::text, now() + interval '15 hours'),
    '1200x LED Batten 45W Surge 4kV, 250x Outdoor IP66 Street Light 90W',
    ARRAY['Haryana', 'Delhi'],
    '70:30 MSE Preference',
    'CLASS_1',
    'https://gem.gov.in/bids/GEM-2026-B-89012.pdf'
),
(
    'GEM/2026/B/99201',
    'High-Density Rugged Tactical Routers (MIL-STD-810G)',
    'Ministry of Home Affairs',
    'Border Security Force (BSF) HQ',
    'BOQ',
    3900000.00,
    78000.00,
    TRUE,
    timezone('utc'::text, now() + interval '4 hours 15 minutes'),
    timezone('utc'::text, now() + interval '5 hours'),
    '40x Rugged Dual-WAN GigE VPN Router with LTE-A module IP67',
    ARRAY['Rajasthan', 'Jammu and Kashmir'],
    '100% to L1',
    'CLASS_1',
    'https://gem.gov.in/bids/GEM-2026-B-99201.pdf'
),
(
    'GEM/2026/B/77102',
    'Armored Optical Fiber Cables 24-Core Single Mode',
    'Ministry of Railways',
    'Northern Railway Construction Organisation',
    'PRODUCT',
    4200000.00,
    84000.00,
    TRUE,
    timezone('utc'::text, now() + interval '22 hours'),
    timezone('utc'::text, now() + interval '23 hours'),
    '35 Km 24-Core Armored Underground OFC ITU-T G.652.D HDPE sheath',
    ARRAY['Delhi'],
    '70:30 MSE Preference',
    'CLASS_1',
    'https://gem.gov.in/bids/GEM-2026-B-77102.pdf'
),
(
    'GEM/2026/B/55410',
    'Heavy Substation Step-Down Transformers 1000 kVA',
    'Ministry of Power',
    'NTPC Power Generation Project',
    'PRODUCT',
    14000000.00,
    280000.00,
    FALSE,
    timezone('utc'::text, now() + interval '48 hours'),
    timezone('utc'::text, now() + interval '49 hours'),
    '4x Oil Immersed Step Down Transformer 11kV to 433V 1000kVA ONAN copper wound',
    ARRAY['Uttar Pradesh'],
    '100% to L1',
    'CLASS_2',
    'https://gem.gov.in/bids/GEM-2026-B-55410.pdf'
),
(
    'GEMC-511687712001',
    'Supply of 24-Port Industrial Gigabit PoE Switches',
    'Ministry of Railways',
    'Western Railway Headquarters, Mumbai',
    'PRODUCT',
    1850000.00,
    37000.00,
    TRUE,
    '2026-01-20T10:00:00Z'::timestamptz,
    '2026-01-20T11:00:00Z'::timestamptz,
    '50x Industrial Gigabit PoE Switches 24-Port Ruggedized',
    ARRAY['Maharashtra', 'Gujarat'],
    '100% to L1',
    'CLASS_1',
    'https://gem.gov.in/contracts/GEMC-511687712001.pdf'
),
(
    'GEMC-511687712002',
    'Commercial LED Batten Luminaires 45W IP65 & High Mast',
    'Ministry of Defence',
    'Military Engineer Services (MES), Southern Command',
    'PRODUCT',
    2400000.00,
    48000.00,
    TRUE,
    '2026-02-05T10:00:00Z'::timestamptz,
    '2026-02-05T11:00:00Z'::timestamptz,
    '800x Commercial LED Batten Luminaires 45W IP65',
    ARRAY['Karnataka', 'Tamil Nadu'],
    '70:30 MSE Preference',
    'CLASS_1',
    'https://gem.gov.in/contracts/GEMC-511687712002.pdf'
),
(
    'GEMC-511687712003',
    'ICU Patient Monitoring Consumables & High-Flow Circuits',
    'Ministry of Health & Family Welfare',
    'AIIMS New Delhi',
    'PRODUCT',
    1275000.00,
    25500.00,
    TRUE,
    '2026-02-22T10:00:00Z'::timestamptz,
    '2026-02-22T11:00:00Z'::timestamptz,
    '1500x ICU Patient Monitoring Consumables',
    ARRAY['Delhi'],
    '100% to L1',
    'CLASS_1',
    'https://gem.gov.in/contracts/GEMC-511687712003.pdf'
),
(
    'GEMC-511687712004',
    'High-Tensile Structural Fasteners & Hex Bolts (M24 Grade 8.8)',
    'Ministry of Defence',
    'Bharat Dynamics Limited, Hyderabad',
    'PRODUCT',
    3120000.00,
    62400.00,
    TRUE,
    '2026-03-15T10:00:00Z'::timestamptz,
    '2026-03-15T11:00:00Z'::timestamptz,
    '25000x High-Tensile Structural Fasteners M24',
    ARRAY['Telangana'],
    '100% to L1',
    'CLASS_1',
    'https://gem.gov.in/contracts/GEMC-511687712004.pdf'
),
(
    'GEMC-511687712005',
    '40W Solar LED Street Lighting Systems with LiFePO4 Battery',
    'Ministry of Rural Development',
    'Department of Rural Development, Andhra Pradesh',
    'PRODUCT',
    4550000.00,
    91000.00,
    TRUE,
    '2026-04-10T10:00:00Z'::timestamptz,
    '2026-04-10T11:00:00Z'::timestamptz,
    '150x 40W Solar LED Street Lighting Systems',
    ARRAY['Andhra Pradesh'],
    '100% to L1',
    'CLASS_1',
    'https://gem.gov.in/contracts/GEMC-511687712005.pdf'
)
ON CONFLICT (bid_number) DO UPDATE SET
    title = EXCLUDED.title,
    estimated_value = EXCLUDED.estimated_value,
    closing_datetime = EXCLUDED.closing_datetime,
    updated_at = timezone('utc'::text, now());

-- Fundamentals Seed (with epbg_amount_inr & oem_authorization_required)
INSERT INTO public.tender_fundamentals (
    tender_id, turnover_required, experience_years, delivery_period_days, 
    epbg_percentage, epbg_amount_inr, oem_authorization_required,
    past_performance_percentage, technical_clauses, required_documents
) VALUES
(
    'GEM/2026/B/89012',
    2500000.00,
    2,
    30,
    3.00,
    85500.00,
    TRUE,
    20.00,
    '[{"clause": "LM-79 and LM-80 BIS test reports mandatory", "mandatory": true}]'::jsonb,
    ARRAY['Udyam Registration Certificate (MSE)', 'CA Turnover Certificate (Last 3 FY)', 'OEM Authorization', 'LM-79 & LM-80 Reports']
),
(
    'GEM/2026/B/99201',
    3500000.00,
    3,
    45,
    5.00,
    195000.00,
    TRUE,
    30.00,
    '[{"clause": "MIL-STD-810G ruggedization compliance mandatory", "mandatory": true}]'::jsonb,
    ARRAY['Udyam Registration Certificate', 'CA Turnover Certificate', 'TEC Certificate', 'Financial Standing Declaration']
),
(
    'GEM/2026/B/77102',
    4000000.00,
    2,
    21,
    3.00,
    126000.00,
    FALSE,
    25.00,
    '[{"clause": "RDSO vendor approval mandatory for railway installations", "mandatory": true}]'::jsonb,
    ARRAY['RDSO Vendor Approval', 'Udyam MSE Exemption Certificate', 'CA Certified Balance Sheets']
),
(
    'GEM/2026/B/55410',
    12000000.00,
    7,
    90,
    10.00,
    1400000.00,
    TRUE,
    50.00,
    '[{"clause": "CPRI type test certification within last 5 years mandatory", "mandatory": true}]'::jsonb,
    ARRAY['CPRI Type Test Certificate', 'Turnover Proof > 1.2 Cr', 'Past Performance for 1000kVA']
)
ON CONFLICT (tender_id) DO UPDATE SET
    turnover_required = EXCLUDED.turnover_required,
    experience_years = EXCLUDED.experience_years,
    delivery_period_days = EXCLUDED.delivery_period_days,
    epbg_percentage = EXCLUDED.epbg_percentage,
    epbg_amount_inr = EXCLUDED.epbg_amount_inr,
    oem_authorization_required = EXCLUDED.oem_authorization_required,
    updated_at = timezone('utc'::text, now());

-- Reverse Auctions Seed
INSERT INTO public.reverse_auctions (
    ra_number, original_bid_number, title, buyer_organization, closing_time, 
    current_l1_inr, min_decrement_inr, total_quantity, auto_extension_minutes, is_extended, status
) VALUES
(
    'GEM-RA-2026-8801',
    'GEM/2026/B/99201',
    'Live Reverse Auction: Rugged Dual-WAN GigE VPN Routers',
    'Border Security Force (BSF) HQ',
    timezone('utc'::text, now() + interval '12 minutes 45 seconds'),
    3840000.00,
    10000.00,
    40,
    10,
    FALSE,
    'ACTIVE'
),
(
    'GEM-RA-2026-7712',
    'GEM/2026/B/89012',
    'Live Reverse Auction: Commercial LED Batten Luminaires 45W',
    'Military Engineer Services (MES)',
    timezone('utc'::text, now() + interval '28 minutes 10 seconds'),
    2650000.00,
    5000.00,
    1450,
    10,
    FALSE,
    'ACTIVE'
)
ON CONFLICT (ra_number) DO UPDATE SET
    current_l1_inr = EXCLUDED.current_l1_inr,
    closing_time = EXCLUDED.closing_time,
    status = EXCLUDED.status,
    updated_at = timezone('utc'::text, now());

-- Corrigenda Seed (with action_required & reconfirm_deadline)
INSERT INTO public.corrigenda (
    tender_id, amendment_type, summary, action_required, reconfirm_deadline, previous_closing, new_closing, published_at
) VALUES
(
    'GEM/2026/B/89012',
    'DUE_DATE_EXTENSION',
    'Bid submission date extended by 48 hours following representations on BIS test report submission guidelines.',
    TRUE,
    timezone('utc'::text, now() + interval '36 hours'),
    timezone('utc'::text, now() + interval '12 hours'),
    timezone('utc'::text, now() + interval '60 hours'),
    timezone('utc'::text, now() - interval '2 hours')
),
(
    'GEM/2026/B/77102',
    'TECHNICAL_SPEC_CHANGE',
    'Clause 4.2 revised: OFC attenuation limit adjusted to <= 0.35 dB/km at 1310 nm matching latest RDSO revision.',
    TRUE,
    timezone('utc'::text, now() + interval '18 hours'),
    timezone('utc'::text, now() + interval '22 hours'),
    timezone('utc'::text, now() + interval '22 hours'),
    timezone('utc'::text, now() - interval '5 hours')
);

-- Mock Vendor Profile Seed
INSERT INTO public.vendor_profiles (
    user_id, organization_name, udyam_number, enterprise_type, annual_turnover, 
    years_experience, target_categories, state, is_oem, biometric_auth_enabled
) VALUES
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Rajesh Hardware & Electrical Solutions',
    'UDYAM-DL-01-0089214',
    'MICRO',
    5000000.00,
    3,
    ARRAY['LED Luminaire', 'Cables', 'Switchgear', 'Tactical Routers', 'Fasteners'],
    'Delhi',
    FALSE,
    TRUE
)
ON CONFLICT (user_id) DO UPDATE SET
    organization_name = EXCLUDED.organization_name,
    enterprise_type = EXCLUDED.enterprise_type,
    annual_turnover = EXCLUDED.annual_turnover,
    updated_at = timezone('utc'::text, now());

-- Mock Vendor Portfolio Seed (Including 5 Accepted GeM Orders GEMC-511687712001 to 12005)
INSERT INTO public.vendor_portfolio (
    user_id, bid_number, status, quoted_l1, expected_l1_benchmark, current_rank, 
    pfms_stage, crac_status, contract_number, invoice_number, pfms_utr_number, 
    sla_compliance, order_date, crac_date
) VALUES
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEM/2026/B/89012',
    'TECHNICAL_EVALUATION',
    2680000.00,
    2750000.00,
    1,
    'ORDER_PLACED',
    'PENDING',
    'GEM/2026/B/89012',
    NULL,
    NULL,
    'ON_TIME',
    timezone('utc'::text, now() - interval '2 days'),
    NULL
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEM/2026/B/99201',
    'REVERSE_AUCTION',
    3900000.00,
    3850000.00,
    2,
    'ORDER_PLACED',
    'PENDING',
    'GEM/2026/B/99201',
    NULL,
    NULL,
    'ON_TIME',
    timezone('utc'::text, now() - interval '5 days'),
    NULL
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEMC-511687712001',
    'AWARDED_L1',
    1850000.00,
    1850000.00,
    1,
    'BANK_UTR_CREDITED',
    'ACCEPTED',
    'GEMC-511687712001',
    'INV-2026-081',
    'RBI260281982736',
    'EARLY_DELIVERY',
    '2026-01-15T00:00:00Z'::timestamptz,
    '2026-01-28T00:00:00Z'::timestamptz
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEMC-511687712002',
    'AWARDED_L1',
    2400000.00,
    2400000.00,
    1,
    'BANK_UTR_CREDITED',
    'ACCEPTED',
    'GEMC-511687712002',
    'INV-2026-094',
    'SBIN00293817264',
    'ON_TIME',
    '2026-02-02T00:00:00Z'::timestamptz,
    '2026-02-16T00:00:00Z'::timestamptz
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEMC-511687712003',
    'AWARDED_L1',
    1275000.00,
    1275000.00,
    1,
    'BANK_UTR_CREDITED',
    'ACCEPTED',
    'GEMC-511687712003',
    'INV-2026-105',
    'HDFC26061928374',
    'ON_TIME',
    '2026-02-20T00:00:00Z'::timestamptz,
    '2026-02-28T00:00:00Z'::timestamptz
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEMC-511687712004',
    'AWARDED_L1',
    3120000.00,
    3120000.00,
    1,
    'BANK_UTR_CREDITED',
    'ACCEPTED',
    'GEMC-511687712004',
    'INV-2026-118',
    'UBIN00482716253',
    'EARLY_DELIVERY',
    '2026-03-12T00:00:00Z'::timestamptz,
    '2026-03-26T00:00:00Z'::timestamptz
),
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'GEMC-511687712005',
    'AWARDED_L1',
    4550000.00,
    4550000.00,
    1,
    'BANK_UTR_CREDITED',
    'ACCEPTED',
    'GEMC-511687712005',
    'INV-2026-132',
    'APGB26093817265',
    'ON_TIME',
    '2026-04-05T00:00:00Z'::timestamptz,
    '2026-04-19T00:00:00Z'::timestamptz
)
ON CONFLICT (user_id, bid_number) DO UPDATE SET
    status = EXCLUDED.status,
    quoted_l1 = EXCLUDED.quoted_l1,
    pfms_stage = EXCLUDED.pfms_stage,
    crac_status = EXCLUDED.crac_status,
    updated_at = timezone('utc'::text, now());
