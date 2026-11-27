-- =============================================================================
-- Migration: 20261024_allow_crawler_upsert.sql
-- Enables public crawler and backend daily ingestion service to upsert live
-- government tenders and fundamentals from bidplus.gem.gov.in into Supabase.
-- =============================================================================

-- 1. Allow crawler to insert new live government tenders
DROP POLICY IF EXISTS "Public can insert live tenders" ON public.tenders;
CREATE POLICY "Public can insert live tenders"
    ON public.tenders FOR INSERT
    WITH CHECK (true);

-- 2. Allow crawler to update existing tenders (e.g. closing date extensions)
DROP POLICY IF EXISTS "Public can update live tenders" ON public.tenders;
CREATE POLICY "Public can update live tenders"
    ON public.tenders FOR UPDATE
    USING (true);

-- 3. Allow crawler to insert 2x2 fundamentals
DROP POLICY IF EXISTS "Public can insert live fundamentals" ON public.tender_fundamentals;
CREATE POLICY "Public can insert live fundamentals"
    ON public.tender_fundamentals FOR INSERT
    WITH CHECK (true);

-- 4. Allow crawler to update fundamentals
DROP POLICY IF EXISTS "Public can update live fundamentals" ON public.tender_fundamentals;
CREATE POLICY "Public can update live fundamentals"
    ON public.tender_fundamentals FOR UPDATE
    USING (true);
