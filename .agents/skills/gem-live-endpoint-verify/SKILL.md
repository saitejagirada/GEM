---
name: gem-live-endpoint-verify
description: >-
  Use this skill when debugging, adding, or updating GeM public data fetching
  (bids, reverse auctions, product categories, GeM services, or PDF extraction)
  in companion_app/services/. Verifies live mkp.gem.gov.in and bidplus.gem.gov.in
  responses directly before changing UI code.
---

# GeM Live Endpoint & PDF Extraction Verification

Use this runbook whenever modifying `GeMLiveSyncService.ts`, `GeMClientCrawler.ts`, `GeMServicesClient.ts`, `PortalDocService.ts`, `GemPdfExtractor.ts`, or `LocalPdfScanner.ts`.

## Core Rule
Never guess GeM URLs, category slugs, JSON schemas, or PDF text patterns. Always test directly against live public GeM endpoints first and lock the parsing behavior with unit tests.

## Steps
1. **Verify Live Endpoint Directly:**
   Run a quick Node probe against the real public endpoint (`bidplus.gem.gov.in` or `mkp.gem.gov.in`) to inspect the exact HTTP status, headers/cookies (e.g. `csrf_bd_gem_nk`), and response body structure.
2. **Validate Allowed Domains Only:**
   Ensure every URL resolves exclusively to verified `*.gem.gov.in` domains (`PortalDocService.ts`). Never route through third-party proxies or custom backends.
3. **Add or Update Unit Tests First (TDD):**
   Add test cases under `companion_app/tests/` covering the real payload shape (e.g., wrapped PDF text, UTF-16BE TCPDF streams, RA + Parent Bid dual URLs, dynamic search category slug discovery).
4. **Verify Live End-to-End & Run Full Suite:**
   ```bash
   cd /Users/giradasaiteja/MiroFish/companion_app
   npm run typecheck && npm test
   ```
5. **Confirm Zero Fallback Fixtures:**
   Verify that if the network fails, the UI displays an explicit retry state rather than fake/hardcoded bids or listings.
