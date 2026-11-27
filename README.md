# GeM Mobile Companion

[![Build Android APK & iOS IPA](https://github.com/saitejagirada/GEM/actions/workflows/build-mobile-artifacts.yml/badge.svg)](https://github.com/saitejagirada/GEM/actions/workflows/build-mobile-artifacts.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%20Native%20%2B%20Expo-0B4F71)](https://github.com/saitejagirada/GEM)

A fast, zero-login mobile companion app for India's **Government e-Marketplace (GeM — `gem.gov.in`)**, built with **React Native, Expo, and TypeScript** for Android and iOS.

---

## Architecture

- **Pure Direct `Phone ↔ GeM` Public Layer**: Connects straight from the user's device to official public `bidplus.gem.gov.in` and `mkp.gem.gov.in` endpoints.
- **Zero Custom Backend & Zero Stored Credentials**: No intermediary server, no password/OTP interception, no automated bid submission, and no mock tender listings.
- **Verified Official Handoff**: Authenticated actions (login, bid submission, KYC signup, contract management) hand off cleanly to verified `*.gem.gov.in` URLs.
- **On-Device PDF Extraction**: Extracts official tender values, EMD/e-PBG terms, consignees, buyer attachments, and ATC clauses locally on the phone.

---

## Key Features

- **My Daily Tender Radar & Watchlist**: Save up to 6 business keywords privately on-device with smart multi-word relevance filtering, `NEW` arrival tracking, live corrigendum checks, and 1-tap Calendar reminders.
- **Full Live GeM Bids & Reverse Auctions**: Browse and search all 40,000+ live ongoing tenders, Live RAs, concluded bids, and cancelled bids with infinite scroll.
- **High-Density Bid & RA Decision Desk**:
  - Inline official PDF viewer + auto-discovered buyer attachments (Specs, Drawings, ATC, BOQ, Corrigenda).
  - **Live Corrigendum & Pre-Bid Q&A Viewer** (extended dates, corrigendum PDFs, vendor queries & official buyer replies).
  - **Private Business Profile + Go / No-Go Eligibility Shield** (checks MSE OEM vs Reseller EMD, Turnover, Experience, MII, and Past Performance).
  - **Bid Margin & RA Walk-Away Floor Calculator** (GST, GeM fee slab, EMD/e-PBG working capital).
  - **ATC Trap Extractor & Instant PDF Keyword Search**.
  - **Similar Concluded Bids** (exact GeM category matching) + verified `gem.gov.in/view_contracts` jump.
  - **3-Tab Role-Specific WhatsApp Briefs** (Partner Deal Sheet, Ask OEM for MAF/Quote, Ask CA for UDIN Turnover Certificate).
- **Reusable Company Doc Locker**: Store recurring seller documents locally with expiry reminders and automatic bid checklist matching.
- **Live GeM Product & Services Search**: Side-by-side 3-OEM product comparison + interactive **GFR 149** procurement threshold helper.
- **Bilingual Support & GeM Glossary**: English / हिन्दी toggle and tap-to-explain `?` glossary for core GeM terms.

---

## Repository Structure

```
├── companion_app/          # React Native + Expo + TypeScript mobile app
│   ├── App.tsx             # Root navigation & tab shell
│   ├── screens/            # Home, Marketplace, Bids, Auctions, Bid/RA Details, MyWork, More
│   ├── components/         # Modals, Calculators, Corrigendum/Q&A Viewer, Eligibility Shield, Icons
│   ├── services/           # Direct GeM public clients, on-device PDF extractor, Radar & Locker
│   ├── theme/              # Light & Dark mode tokens + ThemeContext
│   ├── tests/              # Unit test suite (node --test)
│   └── android/            # Native Android wrapper
├── .github/workflows/      # CI pipelines for standalone Android APK & iOS IPA builds
└── docs/                   # Architecture & PRD references
```

---

## Development & Verification

```bash
cd companion_app
npm install --legacy-peer-deps

# Typecheck & unit tests
npm run typecheck
npm test

# Start Metro dev server
npx expo start
```

### Production Builds (GitHub Actions)
Pushes to `companion_app/**` automatically trigger [build-mobile-artifacts.yml](.github/workflows/build-mobile-artifacts.yml) to build and package both the standalone Android `.apk` and iOS `.ipa`.
