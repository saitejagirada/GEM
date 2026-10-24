# GeM Mobile Companion & Automated Portal Ingestion Engine 🇮🇳

[![Build & Release Standalone APK](https://github.com/saitejagirada/GEM/actions/workflows/build-apk.yml/badge.svg)](https://github.com/saitejagirada/GEM/actions/workflows/build-apk.yml)
[![Tests Passing](https://img.shields.io/badge/tests-174%20passed-success)](https://github.com/saitejagirada/GEM)
[![Design System](https://img.shields.io/badge/UI%2FUX-PhonePe%20Clean%20Design-5F259F)](https://phonepe.com)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20PostgreSQL-3ECF8E)](https://supabase.com)

A high-performance mobile companion application and automated ingestion pipeline designed for government vendors on the **Government e-Marketplace (GeM - gem.gov.in)**. Engineered with a **PhonePe-inspired clean, clutter-free design system**, zero-login live portal ingestion, 100ms clock-drift-synced reverse auctions, and deconstructed zero-PDF tender glanceability.

---

## ⚡ Core Innovations & Features

### 1. Automated Zero-Login Daily Portal Ingestion
- **Direct Portal Crawler**: Ingests ongoing bids from `bidplus.gem.gov.in/all-bids-data` without requiring user accounts or authentication.
- **CSRF & Solr Session Management**: Automatically acquires session tokens, paginates through active bids, and normalizes complex Solr documents.
- **Live Supabase Upsert**: Directly populates `public.tenders` and `public.tender_fundamentals` with fallback to local JSON caching (`backend/data/live_gem_bids.json`).
- **One-Tap Manual Sync**: Vendors can trigger on-demand live portal crawls directly from the mobile home screen banner card.

### 2. PhonePe-Clean Mobile Companion (`companion_app`)
- **Signature Aesthetics**: Crisp `#FFFFFF` background, subtle `#F1F3F6` dividers, and `#5F259F` signature purple accent.
- **Instant Category Filtering**: Horizontal quick-filter chips (`All`, `Defence`, `Railways`, `Medical`, `Power`, `Electronics`) for one-tap tender filtering.
- **Direct GeM Document Opener**: Dual action cards featuring both **Inspect Zero-PDF ➔** and **GeM Doc 📄** (direct links to official portal documents via `Linking.openURL`).
- **5 Bottom Navigation Hubs**:
  1. `HOME`: PhonePe transaction-style procurement hub, active pulse stats, and live tender feed.
  2. `SEARCH`: Full-text tender lookup across titles, departments, and tender numbers.
  3. `SCAN`: Floating lookup and Zero-PDF 2x2 fundamental deconstructor.
  4. `ALERTS`: Real-time corrigendum alerts and closing deadlines.
  5. `HISTORY`: Vendor portfolio tracking past accepted orders, CRAC status, and PFMS milestone disbursements.

### 3. Ultra-Low Latency Reverse Auction Engine
- **Clock Drift Calibration**: Sub-millisecond NTP drift calculation synchronizes bid timestamps to GeM server time.
- **Biometric Last-Second Sniping**: Pre-authorized biometric triggers ensure bids land within the closing 3-second window without anti-sniping penalties.
- **Dynamic L1 Rank Tracking**: Real-time ticker and ranking matrix.

### 4. Zero-PDF 2x2 Fundamentals Deconstruction
- Converts 40+ page government tender PDFs into 4 glanceable quadrants:
  - **Budget & Guarantees**: Estimated value, MSE EMD waivers, ePBG percentages.
  - **Delivery & Geography**: Consignee locations, delivery schedules, splitting ratios.
  - **Eligibility Checklist**: Turnover thresholds, required experience years, past orders.
  - **Mandatory Documentation**: Udyam registration, OEM authorizations (MAF), compliance certifications.

---

## 🏗️ Architecture & Tech Stack

```
├── backend/
│   ├── app/
│   │   ├── api/gem_portal.py          # GeM REST endpoints (pulse, feed, search, sync)
│   │   └── services/
│   │       ├── gem_daily_ingestion.py # Public portal crawler & Solr transformer
│   │       └── gem_portal_service.py  # Feed ranking & fundamentals engine
│   ├── database/
│   │   ├── supabase_schema.sql        # Tables, RLS policies, indexes
│   │   └── migrations/                # Migration scripts (crawler upsert policies)
│   ├── data/live_gem_bids.json        # High-availability offline cache
│   └── tests/                         # 140 automated backend tests (pytest)
│
├── companion_app/
│   ├── screens/
│   │   ├── PhonePeHomeScreen.tsx      # Clean Home screen with live sync & filter chips
│   │   ├── BidInspectorScreen.tsx     # Zero-PDF 2x2 fundamentals & checklist modal
│   │   ├── ReverseAuctionScreen.tsx   # Live 100ms clock-drift-synced auction room
│   │   ├── AuctionsHubScreen.tsx      # Active reverse auction catalog
│   │   ├── ParticipatedPortfolioScreen.tsx # Accepted orders, CRAC & PFMS milestones
│   │   ├── PhonePeAlertsScreen.tsx    # Corrigenda notifications & deadlines
│   │   └── PhonePeSearchScreen.tsx    # Keyword search screen
│   ├── services/
│   │   ├── SupabaseClient.ts          # Supabase PostgREST & Realtime pub/sub client
│   │   ├── UserAgentService.ts        # AI vendor-tender fit & CVC experience scoring
│   │   ├── AuctionRoomClient.ts       # Clock-drift compensated auction client
│   │   └── InspectionEngine.ts        # CRAC 10-day deemed acceptance & watermark engine
│   └── tests/                         # 34 automated mobile tests (node:test)
│
└── .github/workflows/
    └── build-apk.yml                  # Standalone release APK builder
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+
- **Python**: 3.11+
- **Java**: OpenJDK 17 (for Android standalone APK builds)

### 2. Backend Setup & Tests
```bash
# Navigate to backend
cd backend

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run all 140 backend unit tests
pytest tests/
```

### 3. Mobile Companion Setup & Tests
```bash
# Navigate to companion app
cd companion_app

# Install dependencies
npm install

# Run all 34 companion app unit tests
npm test
```

### 4. Trigger Live GeM Portal Sync
```bash
# Ingest live bids directly from gem.gov.in
python -m app.services.gem_daily_ingestion
```

---

## 📦 Automated APK CI/CD Pipeline

The repository includes a standalone GitHub Actions workflow at [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) that automatically builds the unsigned release APK (`gem-companion-standalone-apk`) on every push to `main`.

Artifacts can be downloaded directly from the GitHub Actions run summary.

---

## 🔒 Security & Compliance

- **No Hardcoded Credentials**: Ingestion utilizes public Solr endpoints without storing user credentials.
- **Row-Level Security (RLS)**: Supabase PostgreSQL tables enforce strict tenant separation for vendor portfolios and bid submissions.
- **CERT-In Timestamp Watermarking**: Inspection Engine stamps photographic evidence with cryptographically tamper-evident geo-coordinates and timestamps.

---

## 📄 License

Apache License 2.0. Developed for the Indian Public Procurement Ecosystem.
