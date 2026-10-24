# GeM Mobile Companion - Multi-Thread Project Coordination

This document serves as the shared single source of truth across all 3 development conversations.

---

## 🧵 Thread 1: Build & CI/CD (`build-stream`)
**Focus**: Packaging, native build scripts, GitHub Actions, Gradle, APK releases, and native hardware bridges.

* **Primary Files**:
  * [`.github/workflows/build-apk.yml`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/.github/workflows/build-apk.yml)
  * [`companion_app/package.json`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/package.json)
  * [`companion_app/app.json`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/app.json)
  * [`companion_app/index.js`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/index.js)
* **Current Status**: ✅ **SUCCESSFUL & STABLE**. Standalone offline APK builds via GitHub Actions and runs smoothly on physical Android devices.
* **Rules & Guardrails**:
  * Keep JavaScript bundled with `dev=false` before Gradle runs.
  * Preserve debug keystore signing for zero-friction installation.
  * Only touch CI/CD and packaging configuration in this stream.

---

## 🎨 Thread 2: UI / UX & Mobile Interaction (`ui-ux-stream`)
**Agent ID**: `a4869f6c-1ec1-4291-8efa-dd6ada9f2878`  
**Focus**: Pure PhonePe clean visual design (White background, signature purple header, 4-column quick action grid, "Bid Tools & Analysis", "Key Government Categories", and 5-tab bottom bar with floating center scan button).

* **Primary Files**:
  * [`companion_app/App.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/App.tsx)
  * [`companion_app/screens/UserAgentFeedScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/UserAgentFeedScreen.tsx)
  * [`companion_app/screens/BidInspectorScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/BidInspectorScreen.tsx)
  * [`companion_app/screens/AuctionsHubScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/AuctionsHubScreen.tsx)
  * [`companion_app/screens/ParticipatedPortfolioScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/ParticipatedPortfolioScreen.tsx)
* **Current Status**: ✅ **COMPLETED & OPERATIONAL (Direct PhonePe System Alignment)**.
  * Completely eliminated the dark cyberpunk HUD theme in favor of PhonePe's crisp white (`#FFFFFF`) canvas, royal blue header (`#0D47A1`), and signature purple accents (`#5F259F`).
  * Direct 1:1 alignment with PhonePe reference screenshots in `/Users/giradasaiteja/downloads/files`:
    1. **Top Bar**: Signature PhonePe header with vendor avatar circle (`G`), GeM pill logo, and help icon.
    2. **Section 1 ("Procurement & Bidding")**: 4 circular purple buttons (Daily Matched, Live RA, e-Scrap Lots, MSE Status) with featured MSE promo banner.
    3. **Section 2 ("Bid Tools & Analysis")**: 4 squircle cards (Zero-PDF Inspector, L1 Price Intelligence, Corrigenda Live Watch, Document Vault) with `More ➔` action banner.
    4. **Section 3 ("Key Tender Categories")**: 4 squircle cards (Railways, Defence, Healthcare, IT & Telecom) with explore banner.
    5. **Exact PhonePe 5-Tab Bar**: `Home`, `Search`, **Center Floating Purple Action Button** (`[📄]` launching Instant Zero-PDF Bid Deconstructor lookup), `Alerts` (with green `1` notification badge), and `My Bids` (PhonePe transaction-style participated bids portfolio).
  * 23/23 frontend tests passing and 136/136 backend tests passing.
* **Commit & Build Status**:
  * Pushed commit `7cdd11f` (`feat(ui): overhaul companion app into PhonePe layout, purge camera viewfinder and fake countdown`) to `personal/main`.
  * Triggered GitHub Actions Build Run ID: `40092148265`. Standalone APK artifact `gem-companion-standalone-apk` is compiling with the updated white PhonePe UI.


---

## ⚙️ Thread 3: Backend & Core Systems Architecture (`backend-stream`)
**Agent ID**: `e6973303-6cdb-4b69-9bb6-ee44d3d58fed`  
**Focus**: Daily official GeM portal extraction, 50-page tender PDF deconstruction, dedicated user agent profile matching, pricing intelligence, and REST endpoints.

* **Primary Files**:
  * [`companion_app/types/index.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/types/index.ts)
  * [`backend/app/services/portal_extractor.py`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/services/portal_extractor.py)
  * [`backend/app/services/tender_doc_deconstructor.py`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/services/tender_doc_deconstructor.py)
  * [`backend/app/services/user_agent_matcher.py`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/services/user_agent_matcher.py)
  * [`backend/app/services/pricing_intelligence.py`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/services/pricing_intelligence.py)
  * [`backend/app/api/gem_portal.py`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/api/gem_portal.py)
* **Current Status**: 16/16 unit tests passing. Architecture specifications and REST contracts dispatched to backend stream.
* **Upcoming Goals**:
  * Implement daily portal scraper for `bidplus.gem.gov.in` and `forwardauction.gem.gov.in`.
  * Implement automated PDF deconstructor extracting EMD, turnover, experience, and BOQ items.
  * Implement 0–100% User Agent Match scoring algorithm.
  * Expose REST endpoints: `/api/portal/market-pulse`, `/api/portal/feed`, `/api/portal/bid/:id/fundamentals`, `/api/portal/auctions`, `/api/portal/portfolio`.

