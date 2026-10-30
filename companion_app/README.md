# GeM Mobile Companion App

> A mobile-first companion application for the Government e-Marketplace (GeM), designed based on 21-persona simulation findings from MiroFish.

## Key Modules Implemented

1. **Live Reverse Auction (RA) Bid Room** (`services/AuctionRoom.ts`):
   - Real-time WebSocket auction clock synchronization with NTP-style drift compensation.
   - 1-tap counter-bid increments with local biometric authorization (eliminating SMS OTP delays).
2. **Field-Level CRAC Inspection Engine** (`services/InspectionEngine.ts`):
   - Offline-ready barcode and QR scanner verification.
   - Watermarked camera integration embedding GPS coordinates, UTC timestamps, and Consignee IDs directly onto photo evidence.
   - Statutory 10-day SLA countdown calculator with automated deemed acceptance triggers.
3. **Domain Models & Contracts** (`types/index.ts`):
   - End-to-end TypeScript interfaces covering Bids, Invoices, CRAC inspections, and PFMS payment milestones.

## Phase 1: My Work Workspace

The app now includes a local productivity workspace opened from Home or More:

- Previous bid records with Active / Awarded / All filters.
- Bid-linked document preparation using the device document picker.
- Local checklist preflight against any available bid requirements.
- Explicit handoff to the official GeM bid page or marketplace for login, 2FA, upload, and final submission.

Phase 1 did not store GeM credentials, OTPs, session cookies, or claim that a local attachment was uploaded. Phase 2 adds app-private persistence for preparation copies while keeping the same boundary.

## Phase 2: Persistent Local Preparation

Phase 2 keeps the productivity layer useful after the app is closed:

- Selected files are copied into the app-private document directory when native storage is available.
- File metadata and bid links are persisted locally with AsyncStorage.
- Bids added from the inspector are restored as local tracking records when My Work opens again.
- The workspace labels each file as saved on device or session-only, so storage failures are visible.
- Users can remove individual files or clear all local preparation copies from My Work.

This is still a preparation workspace, not an official GeM account mirror or upload channel. Local files are not encrypted by this feature and should be handled as sensitive business documents; credentials, OTPs, and session cookies are never stored.

## Documentation References

* Full PRD: [`docs/gem_mobile_companion_prd.md`](../docs/gem_mobile_companion_prd.md)
* Technical Architecture & Wireframes: [`docs/gem_mobile_companion_architecture.md`](../docs/gem_mobile_companion_architecture.md)
