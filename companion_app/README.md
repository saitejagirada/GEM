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

## Documentation References

* Full PRD: [`docs/gem_mobile_companion_prd.md`](../docs/gem_mobile_companion_prd.md)
* Technical Architecture & Wireframes: [`docs/gem_mobile_companion_architecture.md`](../docs/gem_mobile_companion_architecture.md)
