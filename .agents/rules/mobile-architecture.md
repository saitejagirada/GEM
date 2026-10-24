# GeM Mobile Architecture & Security Standards

## 1. Offline-First Mandate
- Consignee inspectors frequently operate in remote defense depots and rail yards without reliable 4G/5G connectivity.
- All inspection actions (barcode scans, photo evidence, CRAC sign-offs) must first be committed locally with an idempotency key (`UUIDv4`).
- Sync queues must employ exponential backoff with jitter and transactional safety.

## 2. Reverse Auction Real-Time Invariance
- Bidding occurs under high concurrency with sub-second price decrements.
- Client devices must calculate and store the server clock offset (`estimatedServerTime - Date.now()`) on WebSocket connection and periodic PING/PONG heartbeats.
- Bid submission timestamps must be adjusted for clock drift to prevent false timeout rejections.

## 3. Indian Government (GeM / CERT-In) Compliance
- All on-site photo evidence must carry an immutable watermark text containing PO Number, Consignee ID, UTC Timestamp, and GPS coordinates with accuracy radius.
- Photos must be hashed with SHA-256 for tamper-proof audit trails per General Financial Rules (GFR) 2017.
- High-stakes counter-bids require local device biometric authorization (FaceID/Fingerprint) instead of SMS OTP to prevent network latency timeouts.

## 4. Field Usability & Ergonomics
- Minimum touch target size: 48x48 dp.
- High contrast palette for readability under outdoor direct sunlight.
- Critical actions (Submit Bid, Record Consignment Acceptance) must use double-confirmation or slide-to-confirm to prevent accidental submissions.
