# GeM Mobile Architecture & Guardrail Standards

## 1. Direct Phone-to-GeM Architecture (Option 1)
- `companion_app` is a **read-only public GeM UI layer + official portal handoff** built with React Native, Expo, and TypeScript for Android and iOS.
- Live data is fetched directly from official public GeM domains (`bidplus.gem.gov.in`, `mkp.gem.gov.in`, `gem.gov.in`, `forwardauction.gem.gov.in`).
- No backend server, no Supabase runtime dependency in UI screens, no credential storage, and no simulated bid placement.

## 2. Data Honesty & On-Device Parsing
- Never fabricate or pre-fill tender fundamentals (EMD, ePBG, estimated value, turnover, experience, L1 price, or seller rank).
- Extract tender fundamentals locally on-device from official GeM PDFs (`GemPdfExtractor.ts` / `LocalPdfScanner.ts`) and display `"In PDF"` or `"Not published"` when absent.
- Inline PDF viewing must resolve verified `bidplus.gem.gov.in` document URLs (both RA PDF and Original Parent Bid PDF when linked) and reject lookalike domains (`PortalDocService.ts`).

## 3. UI Ergonomics & Restraint
- Minimum touch target size: 44–48 dp.
- Respect `theme/designTokens.ts` and `useTheme()` across Light Mode, Dark Mode, and accessibility font scaling.
- Avoid decorative emojis, fake avatars, dead alerts, or unsolicited multi-screen overhauls.
- Verify real visual behavior on device/emulator or get explicit user sign-off on a screen-by-screen plan before making layout changes.
