# GeM Mobile Companion App

> A mobile-first companion application for the Government e-Marketplace (GeM): public discovery, response preparation, and an explicit handoff to the official portal.

## Key Modules Implemented

1. **Live public discovery** (`services/GeMLiveSyncService.ts`):
   - Reads the current public GeM bid listing without seeding demo rows or inventing commercial fields.
   - Shows public reverse-auction records without simulating L1, rank, quotes, or bid placement.
2. **Document preparation** (`screens/MyWorkScreen.tsx`):
   - Bid-linked local folders, file picker, checklist review, and storage state.
   - Keeps business documents on the device until the user chooses to continue on GeM.
   - Optional bid-PDF details scan runs on the device only, stores a small extracted summary, and deletes its temporary PDF copy.
3. **Official portal workspace** (`screens/OfficialPortalScreen.tsx`):
   - Opens official GeM login and public pages through the device browser.
   - Keeps credentials, OTPs, cookies, private history, and final submission inside GeM.

## Public live bids and document preparation

The app now starts from the current public GeM bid listing and a preparation workspace opened from Home or More:

- Live public bid rows fetched from GeM's public listing endpoint.
- No seeded bid portfolio, invented deadlines, guessed values, or fake eligibility verdicts.
- Bid-linked document preparation using the device document picker.
- A checklist only when requirements are actually present in the record; otherwise the UI directs the user to the official bid document.
- Explicit handoff to the official GeM bid page for login, MFA, upload, and final submission.
- The PDF details scanner is user-triggered and bounded to 12 MB; it reads a PDF text layer locally and does not send documents to a server.

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

The companion provides a controlled bridge to the real GeM workflow:

- My Work records which bid and local documents were prepared when the user opens the official GeM portal.
- The user completes GeM login, MFA, document upload, and final submission in the official portal.
- The handoff record only records that the official bid page was opened; it does not verify submission.

Direct authenticated GeM uploads remain behind an approved GeM API/SSO integration contract. The app does not automate MFA, capture portal cookies, replay browser sessions, or claim that a document reached GeM.

## Phase 4: Official-style visual system

The UI uses a compact, information-first visual language aligned with the public GeM portal:

- Government blue, neutral grey surfaces, tricolor micro-accent, and restrained status colors.
- Square-edged cards, compact controls, dense metadata, and plain text labels instead of emoji-heavy dashboard decoration.
- Clear separation between public feed data, local preparation state, and official account actions.

## Documentation References

* Full PRD: [`docs/gem_mobile_companion_prd.md`](../docs/gem_mobile_companion_prd.md)
* Technical Architecture & Wireframes: [`docs/gem_mobile_companion_architecture.md`](../docs/gem_mobile_companion_architecture.md)
