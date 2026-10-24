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
**Focus**: Mobile ergonomic experience, design system, sunlight legibility, outdoor yard usage, animations, and tactile feedback.

* **Primary Files**:
  * [`companion_app/App.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/App.tsx)
  * [`companion_app/screens/ReverseAuctionScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/ReverseAuctionScreen.tsx)
  * [`companion_app/screens/CracInspectorScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/CracInspectorScreen.tsx)
  * [`companion_app/screens/PfmsTrackerScreen.tsx`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/screens/PfmsTrackerScreen.tsx)
* **Current Status**: Baseline functional prototypes active for all 3 screens.
* **Upcoming Goals**:
  * Refine visual hierarchy and typography for direct sunlight.
  * Add haptic and audio confirmation for bid decrements in the Auction room.
  * Polish camera viewfinder overlay with interactive crosshairs and watermark opacity.
  * Polish 6-stage milestone tracker with animated progress lines.

---

## ⚙️ Thread 3: Backend & Core Systems Architecture (`backend-stream`)
**Focus**: Reverse auction WebSockets, clock drift synchronization, offline SQLite mutation queues, PFMS integration, and MiroFish simulation APIs.

* **Primary Files**:
  * [`companion_app/types/index.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/types/index.ts)
  * [`companion_app/services/AuctionRoom.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/services/AuctionRoom.ts)
  * [`companion_app/services/InspectionEngine.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/services/InspectionEngine.ts)
  * [`companion_app/services/OfflineQueue.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/services/OfflineQueue.ts)
  * [`companion_app/services/PfmsTracker.ts`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/companion_app/services/PfmsTracker.ts)
  * [`backend/app/`](file:///Users/giradasaiteja/.gemini/antigravity/scratch/MiroFish/backend/app/)
* **Current Status**: 16/16 automated unit tests passing across all 4 core services.
* **Upcoming Goals**:
  * Connect mobile app to MiroFish backend Flask simulation server (`http://localhost:5001`).
  * Implement WebSocket mock/live server endpoint for real-time reverse auction streaming.
  * SQLite persistence driver for `OfflineQueue`.
