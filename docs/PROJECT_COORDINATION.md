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
**Focus**: PhonePe & Groww-inspired visual hierarchy, glanceable tender cards, instant zero-PDF bid fundamentals, thumb ergonomics, and auctions war room.

* **Primary Files**:
  * [`companion_app/App.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/App.tsx)
  * [`companion_app/screens/UserAgentFeedScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/UserAgentFeedScreen.tsx)
  * [`companion_app/screens/BidInspectorScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/BidInspectorScreen.tsx)
  * [`companion_app/screens/AuctionsHubScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/AuctionsHubScreen.tsx)
  * [`companion_app/screens/ParticipatedPortfolioScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/ParticipatedPortfolioScreen.tsx)
* **Current Status**: ✅ **COMPLETED & OPERATIONAL (PhonePe + Groww Hybrid UI/UX)**.
  * `UserAgentFeedScreen.tsx`: Live Market Pulse ticker, horizontal pill filters (`90%+ Match`, `Zero EMD`, `Defence`, `Railways`, `Closing Soon`), dedicated agent hero card, and ranked match cards.
  * `BidInspectorScreen.tsx`: Zero-PDF instant drawer displaying eligibility verdict, AI predictive L1 benchmark range, 2x2 fundamentals grid, operational risk flags, BOQ line items, consignee geocoding, and interactive document checklist.
  * `AuctionsHubScreen.tsx`: Unified segmented hub with live Reverse Auctions (hold-to-bid double-tap guard, L1 gap ticker, urgency pulse) and Forward Auctions (`forwardauction.gem.gov.in` surplus machinery & e-scrap lots).
  * `ParticipatedPortfolioScreen.tsx`: PhonePe holdings-style active vs awarded submissions, quoted vs benchmark pricing variance, and deep links to field inspection & PFMS tracking.
  * Hardened outdoor yard ergonomics (min 48x48dp touch bounds, rapid steppers for gloved inspectors, high-contrast dark palette, tactile haptics).
* **Next Steps**:
  * Real-time WebSocket streaming integration with Thread 3's backend simulation endpoints.

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

