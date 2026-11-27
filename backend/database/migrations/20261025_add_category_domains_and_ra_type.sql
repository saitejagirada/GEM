-- Migration: Add Category Domains and Multi-Type Procurement Support (PRODUCT, SERVICE, BOQ, CUSTOM, RA)
-- Date: 2026-10-25
-- Enables comprehensive categorization of Indian Public Procurement on GeM

-- 1. Ensure tenders check constraint supports RA (Reverse Auction) along with PRODUCT, SERVICE, BOQ, CUSTOM
ALTER TABLE IF EXISTS public.tenders
    DROP CONSTRAINT IF EXISTS tenders_bid_type_check;

ALTER TABLE IF EXISTS public.tenders
    ADD CONSTRAINT tenders_bid_type_check
    CHECK (bid_type IN ('PRODUCT', 'SERVICE', 'BOQ', 'CUSTOM', 'RA'));

-- 2. Add category_domain column if not exists
ALTER TABLE IF EXISTS public.tenders
    ADD COLUMN IF NOT EXISTS category_domain VARCHAR(64) DEFAULT 'General Goods & Supplies';

-- 3. Create index for fast mobile category and type lookups
CREATE INDEX IF NOT EXISTS idx_tenders_bid_type_domain
    ON public.tenders (bid_type, category_domain);

-- 4. Enable public crawler upserts for category_domain
DROP POLICY IF EXISTS "Public can insert live tenders" ON public.tenders;
CREATE POLICY "Public can insert live tenders" ON public.tenders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update live tenders" ON public.tenders;
CREATE POLICY "Public can update live tenders" ON public.tenders FOR UPDATE USING (true);
