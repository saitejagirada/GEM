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

## Public live bids and document preparation

The app now starts from the current public GeM bid listing and a preparation workspace opened from Home or More:

- Live public bid rows fetched from GeM's public listing endpoint.
- No seeded bid portfolio, invented deadlines, guessed values, or fake eligibility verdicts.
- Bid-linked document preparation using the device document picker.
- A checklist only when requirements are actually present in the record; otherwise the UI directs the user to the official bid document.
- Explicit handoff to the official GeM bid page for login, MFA, upload, and final submission.

The app does not store GeM credentials, OTPs, session cookies, private bid history, or claim that a local attachment was uploaded.

## Phase 2: Persistent Local Preparation

Phase 2 keeps the productivity layer useful after the app is closed:

- Selected files are copied into the app-private document directory when native storage is available.
- File metadata and bid links are persisted locally with AsyncStorage.
- Preparation files remain linked to the selected live bid on this device.
- The workspace labels each file as saved on device or session-only, so storage failures are visible.
- Users can remove individual files or clear all local preparation copies from My Work.

This is still a preparation workspace, not an official GeM account mirror or upload channel. Local files are not encrypted by this feature and should be handled as sensitive business documents; credentials, OTPs, and session cookies are never stored.

## Official GeM Handoff

Phase 3 adds a controlled bridge to the real GeM workflow:

- My Work records which bid and local documents were prepared when the user opens the official GeM portal.
- The user completes GeM login, MFA, document upload, and final submission in the official portal.
- The handoff record only records that the official bid page was opened; it does not verify submission.

Direct authenticated GeM uploads remain behind an approved GeM API/SSO integration contract. The app does not automate MFA, capture portal cookies, replay browser sessions, or claim that a document reached GeM.

## Documentation References

* Full PRD: [`docs/gem_mobile_companion_prd.md`](../docs/gem_mobile_companion_prd.md)
* Technical Architecture & Wireframes: [`docs/gem_mobile_companion_architecture.md`](../docs/gem_mobile_companion_architecture.md)
