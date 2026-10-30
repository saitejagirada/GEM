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

Phase 1 does not store GeM credentials, OTPs, session cookies, or claim that a local attachment was uploaded. Files selected here remain preparation copies in the app session until an approved integration and secure document storage layer are added.

## Documentation References

* Full PRD: [`docs/gem_mobile_companion_prd.md`](../docs/gem_mobile_companion_prd.md)
* Technical Architecture & Wireframes: [`docs/gem_mobile_companion_architecture.md`](../docs/gem_mobile_companion_architecture.md)
