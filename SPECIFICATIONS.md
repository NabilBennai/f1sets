# F1Sets — Functional & Technical Specifications (Angular + Spring Boot + MySQL)

This document specifies a web application that mimics the user-facing features of F1Laps (public calculators/resources + authenticated lap tracking, analytics, telemetry, setups, leaderboards, subscriptions). It is written so a dev team can implement without additional product “conception”.

**Primary reference behaviors (observed on f1laps.com):**
- Public landing positioning: automatic data sync, lap analysis, telemetry, session history, season tracking, setup database, AI difficulty calculator, leaderboards, performance analytics. :contentReference[oaicite:0]{index=0}
- AI Difficulty Calculator: per track page where user inputs a time trial lap time and gets a recommended AI difficulty; guidance mentions Equal Performance Time Trial. :contentReference[oaicite:1]{index=1}
- Setups: per game version → track list → track setups list with filters (condition, team, session type, controller/wheel) and a setup detail page showing setup parameters (wings, differential, geometry, suspension, brakes, tyre pressures) + metadata. :contentReference[oaicite:2]{index=2}
- Leaderboard: per game version → track list → track leaderboard showing top 10 laps with date, time, user, team, session and flags like “Has telemetry data”. :contentReference[oaicite:3]{index=3}
- Track guides: per track includes track details (GP name, circuit name, length, real-world lap record, esports record, sector breakdown, track image) and links to setups, difficulty calculator, leaderboard; “Add New Lap Time” requires registration. :contentReference[oaicite:4]{index=4}
- Auth: register with email/username/password; also supports Google/Discord on some register flows. :contentReference[oaicite:5]{index=5}
- Pricing tiers: Free, Premium, Champion with increasing access (sessions, seasons, analytics, telemetry, leaderboard eligibility), including free trial for paid tiers. :contentReference[oaicite:6]{index=6}
- Resources (“Data”): a list of data articles such as average AI difficulty and average lap times by track and game version. :contentReference[oaicite:7]{index=7}

---

## 1. Goals

### 1.1 Product goals
1. Provide public tools/resources for F1 game players:
   - AI difficulty recommendation per track.
   - Community setups browsing (with filters) and setup detail pages.
   - Track guide pages with track facts and links to relevant resources.
   - Time trial leaderboard per track with telemetry availability indicator.
2. Provide authenticated features (modeled after the F1Laps positioning on the landing page):
   - Automatic import of lap/session data (via companion apps / telemetry ingestion).
   - Session history and season tracking (Career/MyTeam/Championship).
   - Telemetry analysis (time series: speed, throttle, brake, gear, steering, delta).
   - Performance analytics and trend insights.
3. Monetize via subscriptions:
   - Free: basic season & lap data.
   - Premium: all session + season data + analytics.
   - Champion: adds telemetry and leaderboard eligibility. :contentReference[oaicite:8]{index=8}

### 1.2 Non-goals
- Building native companion apps (Windows/Mac/iOS) in this scope; instead define ingestion APIs and a reference uploader/SDK.
- Multiplayer matchmaking or in-game overlays.

---

## 2. Personas
1. **Guest user**: browses setups, track guides, calculators, leaderboards.
2. **Registered (Free)**: can add lap times, connect importer, see basic history.
3. **Premium**: deeper session/season details + analytics dashboards.
4. **Champion**: telemetry viewer, telemetry comparisons, leaderboard inclusion.

---

## 3. Functional Specifications

### 3.1 Information Architecture / Navigation
Top-level modules (mirroring observed nav items):
- **AI Difficulty**
- **Setups**
- **Leaderboard**
- **Tracks (Track Guides)**
- **Pricing**
- **Resources (Data articles)**
- **Auth (Sign in/Sign up)** :contentReference[oaicite:9]{index=9}

Additional authenticated area (not publicly visible on the site pages we could access):
- Dashboard
- Sessions
- Seasons
- Telemetry
- Analytics
- Account & Subscription
- Import/Connect

---

## 4. Public Features (Guest-accessible)

### 4.1 Landing / Marketing pages
**Pages**
- `/` Home: marketing sections for auto sync, lap analysis, telemetry, session history, season tracking, setups, AI difficulty, leaderboards, analytics; CTA “Start Tracking Free”. :contentReference[oaicite:10]{index=10}
- `/pricing` pricing tiers (Free/Premium/Champion) with features list and “Start free trial”. :contentReference[oaicite:11]{index=11}

**Requirements**
- Responsive layout (mobile first), static content cached via CDN.
- CTA buttons lead to registration.

---

### 4.2 AI Difficulty Calculator (Public)
**Observed pattern**
- Global page lists tracks.
- Track page contains instructions + one input field for lap time and a button “Calculate Difficulty”. :contentReference[oaicite:12]{index=12}

**Pages**
- `/ai-difficulty-calculator` (default latest game) track grid/list.
- `/ai-difficulty-calculator/{gameCode}` track grid/list (e.g., f12025).
- `/ai-difficulty-calculator/{gameCode}/{trackSlug}` calculator page.

**Track calculator page requirements**
- Instruction block:
  - “Set a lap in Time Trial using Equal Performance Mode… enter lap time… test and adjust.” :contentReference[oaicite:13]{index=13}
- Lap time input:
  - Accept formats: `M:SS.mmm`, `MM:SS.mmm`, `SS.mmm` (auto normalize).
  - Validate bounds: >0 and less than configurable max (e.g., 10 minutes).
  - Inline validation errors.
- Calculation result:
  - Output recommended AI difficulty integer 0–110 (configurable).
  - Also output a confidence band (e.g., ±2 difficulty) and explanatory text.
- Share link:
  - “Copy link” preserving entered time as query param (optional).
- Track context:
  - Track name and game version displayed.

**AI difficulty algorithm (functional expectation)**
- Per (game, track, equal-performance time trial) maintain a mapping from lap time → AI difficulty.
- Implement as:
  - A calibration curve using anchor points (difficulty, targetLapMs).
  - Use monotonic interpolation (piecewise linear).
  - For times outside known range, clamp and warn.
- Admin/backoffice: ability to update curve per track and publish version.

**APIs**
- `GET /api/public/games`
- `GET /api/public/games/{gameCode}/tracks`
- `GET /api/public/ai-difficulty/{gameCode}/{trackSlug}/curve`
- `POST /api/public/ai-difficulty/{gameCode}/{trackSlug}/calculate` with `{lapTimeMs}` → `{difficulty, bandLow, bandHigh, methodVersion}`

---

### 4.3 Setups Browser (Public)
**Observed pattern**
- Track setups page includes filters:
  - Condition: Any/Dry/Wet/Mixed
  - Team list (includes F1 teams + custom teams + feeder series entries as options)
  - Session: Time Trial / Race
  - Controller: Controller / Wheel
- Results table columns: User, Team, Session, Lap time; row opens setup detail. :contentReference[oaicite:14]{index=14}

**Pages**
- `/setups/tracks` track grid/list (by game).
- `/setups/{gameCode}/tracks/{trackSlug}` setups list with filters.
- `/setups/{gameCode}/{setupId}` setup detail.

**Filters (functional)**
- Condition: enum {DRY, WET, MIXED}
- Team: multi-select; includes official teams + “My Team / F1 Custom Team”
- Session type: enum {TIME_TRIAL, RACE}
- Input type: enum {CONTROLLER, WHEEL}
- Sorting:
  - Default: fastest lap time first (ascending lapTimeMs) when present.
  - Secondary sort: newest date.
- Pagination:
  - Page size 20 (configurable), show total count.

**Setup detail requirements**
Display:
- Header: “F1 {game} {track} Setup (Dry/Wet)” + “by {username}”
- Metadata:
  - Team, Session, Lap time, Conditions, Steering, Date :contentReference[oaicite:15]{index=15}
- Setup sections (all numeric values with units where appropriate):
  - Aerodynamics: frontWing, rearWing
  - Transmission: diffOnThrottle%, diffOffThrottle%, engineBraking%
  - Suspension geometry: camber, toe
  - Suspension: frontSusp, rearSusp, frontARB, rearARB, rideHeight
  - Brakes: brakePressure, brakeBias
  - Tyres: tyre pressures (FR/FL/RR/RL) :contentReference[oaicite:16]{index=16}
- “Back to all {track} setups” link.

**Content model note**
Allow setup parameters to evolve by game version (fields may differ). Store as versioned schema or JSON + validated templates (see DB).

**APIs**
- `GET /api/public/setups/{gameCode}/tracks/{trackSlug}` with query params for filters, page, sort.
- `GET /api/public/setups/{gameCode}/{setupId}`

---

### 4.4 Leaderboard (Public)
**Observed pattern**
- Track leaderboard shows top 10, includes date, lap time, user, team, session plus flags: condition, input device, “Has telemetry data”. :contentReference[oaicite:17]{index=17}

**Pages**
- `/laptimes/leaderboard` track grid/list (by game).
- `/laptimes/leaderboard/{gameCode}/{trackSlug}` top 10 list.

**Rules**
- Only “valid Time Trial laps” are eligible (as described). :contentReference[oaicite:18]{index=18}
- If telemetry is required for leaderboard inclusion, enforce at eligibility layer for Champion plan (configurable). :contentReference[oaicite:19]{index=19}
- Each entry links to a lap detail/telemetry viewer:
  - Guests can see summary; telemetry charts gated by Champion.

**APIs**
- `GET /api/public/leaderboard/{gameCode}/{trackSlug}` → list top 10.
- `GET /api/public/laps/{lapId}` → lap summary (public fields only).
- `GET /api/public/laps/{lapId}/telemetry/availability` → boolean + requiredPlan

---

### 4.5 Track Guides (Public)
**Observed pattern**
- Track page includes: GP name, circuit name, length, F1 lap record, esports lap record, sector labels, track image, plus links: Top Setups, Difficulty Calculator, Leaderboard, and “Add New Lap Time” (requires registration). :contentReference[oaicite:20]{index=20}

**Pages**
- `/tracks` track grid/list (by game).
- `/tracks/{gameCode}/{trackSlug}` guide page.

**Track guide requirements**
- Track summary:
  - Name + circuit name :contentReference[oaicite:21]{index=21}
- “Quick actions” buttons:
  - Top Setups → setups track page
  - Difficulty Calculator → AI difficulty track page
  - Leaderboard → track leaderboard page :contentReference[oaicite:22]{index=22}
- Track details table:
  - Grand Prix name
  - Circuit name
  - Length (km)
  - F1 lap record (time)
  - Esports lap record (time trial)
- Track image:
  - Serve from CDN; store attribution.
- “Add New Lap Time”:
  - If guest → redirect to register with `next` param preserved (observed). :contentReference[oaicite:23]{index=23}

**APIs**
- `GET /api/public/tracks/{gameCode}/{trackSlug}`

---

### 4.6 Resources / Data Articles (Public)
**Observed pattern**
- A list of data articles like “Average F1 25 AI Difficulty”, “Average F1 25 Lap Times”, etc. :contentReference[oaicite:24]{index=24}

**Pages**
- `/resources` list page
- `/resources/{slug}` article page (CMS-like)

**Requirements**
- Admin creates articles with blocks: markdown/HTML, charts, tables.
- Optional data-driven charts from aggregates.

**APIs**
- `GET /api/public/resources`
- `GET /api/public/resources/{slug}`

---

## 5. Authenticated Features (Core Product)

### 5.1 Authentication & Account
**Flows**
- Register:
  - Email, username, password (min 8 chars). :contentReference[oaicite:25]{index=25}
  - Optional social login providers: Google, Discord. :contentReference[oaicite:26]{index=26}
- Login:
  - Username or email + password; forgot password. :contentReference[oaicite:27]{index=27}
- Account settings:
  - Change email
  - Change username
  - Privacy toggles (e.g., hide username from leaderboard; “can be disabled anytime” is implied by UI text). :contentReference[oaicite:28]{index=28}
- Security:
  - MFA optional (recommended)
  - Session management (logout all sessions)

**Authorization roles**
- `GUEST`
- `USER_FREE`
- `USER_PREMIUM`
- `USER_CHAMPION`
- `ADMIN`

---

### 5.2 Lap Time Submission (Manual)
Even if ingestion exists, provide manual lap entry as implied by “Add New Lap Time”. :contentReference[oaicite:29]{index=29}

**Pages**
- `/laptimes/new?track={trackSlug}&game={gameCode}&next=...`

**Form fields**
- Game version
- Track
- Session type (Time Trial default)
- Condition (Dry default)
- Input device (Controller/Wheel)
- Team / Car selection
- Lap time (M:SS.mmm)
- Validity checkbox(es):
  - Equal performance (for time trial) when applicable
- Telemetry attachment:
  - If user has telemetry ingestion configured, allow selecting telemetry file/session.
  - Otherwise allow upload (CSV/JSON) if Champion.

**Validation**
- Prevent duplicates:
  - If same user submits same lap time within small tolerance for same track/session, warn.
- Range checks per track (configurable).

**Effects**
- Save lap
- If eligible and user plan permits, rank on leaderboard (top 10 recompute).

---

### 5.3 Data Import / Automatic Sync (Ingestion)
Landing claims “apps capture every lap automatically while you play”. :contentReference[oaicite:30]{index=30}  
Implement as an ingestion platform.

**Ingestion options**
1. **Push API** (recommended):
   - Companion client obtains OAuth device token and pushes sessions/laps/telemetry.
2. **File upload**:
   - User uploads exported telemetry/session files.

**Ingestion entities**
- Session:
  - practice/qualifying/sprint/race/time trial
  - track, car/team, assists, weather, tyre stints, results
- Lap:
  - lap time, sector times, invalid flags, tyre wear estimate, ERS usage
- Telemetry:
  - time series per lap: speed, throttle, brake, gear, steer, rpm, drs, ers, delta

**API endpoints (authenticated)**
- `POST /api/ingest/device/register` → device code flow
- `POST /api/ingest/sessions` (bulk)
- `POST /api/ingest/laps` (bulk)
- `POST /api/ingest/telemetry` (bulk; chunked)
- `GET /api/me/import/status`

**Idempotency**
- Require `externalSource` + `externalId` keys on ingested objects.
- Use idempotency keys for bulk posts.

**Plan gating**
- Free: accept basic lap + season summary.
- Premium: accept full session details.
- Champion: accept telemetry payloads and store high-resolution points.

---

### 5.4 Session History
Landing claims “Every practice, qualifying, sprint, and race saved automatically… tyre strategies, pit stops, penalties”. :contentReference[oaicite:31]{index=31}

**Pages**
- `/sessions` list with filters (game, mode, track, date range)
- `/sessions/{sessionId}` detail:
  - classification results
  - stints + pit stops
  - penalties
  - lap chart and key laps
  - per-lap breakdown table

**Requirements**
- Pagination, export CSV
- Compare two sessions (premium+)

---

### 5.5 Season Tracking
Landing claims season tracking for Career/MyTeam/Championship with standings and race results. :contentReference[oaicite:32]{index=32}

**Pages**
- `/seasons` list
- `/seasons/{seasonId}`:
  - calendar of events
  - standings over time
  - team performance
  - driver stats

**Data model support**
- Multiple season types: Career, MyTeam, Championship, Custom
- Link sessions and events to season

---

### 5.6 Telemetry Viewer (Champion)
Landing claims pro-level telemetry with meter-by-meter analysis and side-by-side comparisons. :contentReference[oaicite:33]{index=33}

**Pages**
- `/telemetry/laps/{lapId}`
- `/telemetry/compare?lapA=&lapB=`

**Core charts**
- Distance-based charts (normalize laps by distance):
  - speed vs distance
  - throttle vs distance
  - brake vs distance
  - gear vs distance
  - steering vs distance
  - delta (time difference) vs distance
- Track map with racing line heat (optional if data includes X/Y)
- Sector splits and corners markers (if track metadata provides)

**Performance requirements**
- Telemetry points can be large:
  - Use downsampling for preview
  - Stream in chunks
  - Cache computed lap “distance axis”

**Plan gating**
- Non-Champion:
  - show “Has telemetry data” badge on leaderboard but block charts behind upgrade.

---

### 5.7 Analytics
Landing claims “automated insights… trends in lap times, AI difficulty, team performance”. :contentReference[oaicite:34]{index=34}

**Dashboards**
- Lap time trend per track over time
- Best laps distribution vs community average
- AI difficulty usage over time (if user stores difficulty setting per track)
- Consistency (std dev by stint/session)
- Setup effectiveness:
  - correlate setups used with lap times (if “setup used” is known)

**Jobs**
- Nightly aggregation tables for:
  - per user per track: PB, average, count, trend slopes
  - per track global: average lap times, average AI difficulty (for resources articles)

---

## 6. Subscription & Billing
Observed tiers and features: Free, Premium, Champion; trial for paid tiers. :contentReference[oaicite:35]{index=35}

**Requirements**
- Integrate Stripe (or equivalent):
  - monthly and yearly prices
  - 14-day trial for Premium/Champion
  - upgrade/downgrade with proration rules
  - cancellation at period end
- Entitlements service:
  - Determine access to session data, telemetry storage, leaderboard eligibility.

**Plan entitlements (minimum)**
- Free:
  - basic lap times storage
  - season summary (limited)
  - public browsing
- Premium:
  - full sessions + seasons + analytics
- Champion:
  - telemetry storage and viewer
  - leaderboard eligibility for user’s laps :contentReference[oaicite:36]{index=36}

---

## 7. Detailed User Stories (Epics)

### Epic A — Public Discovery (SEO-first)
1. **As a guest**, I can browse the latest game’s track list for AI difficulty, setups, leaderboard, and tracks.
2. **As a guest**, I can open a track guide and see track details, records, and quick links. :contentReference[oaicite:37]{index=37}
3. **As a guest**, I can view top 10 laps for a track and see whether telemetry exists. :contentReference[oaicite:38]{index=38}
4. **As a guest**, I can browse setups for a track with filters and open a setup detail page to copy values. :contentReference[oaicite:39]{index=39}
5. **As a guest**, I can use the AI difficulty calculator by entering my lap time. :contentReference[oaicite:40]{index=40}
6. **As a guest**, when I click “Add New Lap Time”, I’m redirected to register and returned afterwards. :contentReference[oaicite:41]{index=41}

**Acceptance criteria (sample)**
- Track list pages load in <2s on 4G for EU region.
- All public pages have canonical URLs and JSON-LD (Track/Article).

---

### Epic B — Authentication & Account
1. **As a user**, I can register with email/username/password. :contentReference[oaicite:42]{index=42}
2. **As a user**, I can sign in with username or email. :contentReference[oaicite:43]{index=43}
3. **As a user**, I can sign up with Google or Discord (optional). :contentReference[oaicite:44]{index=44}
4. **As a user**, I can reset my password.
5. **As a user**, I can configure privacy settings (hide username from public views).

---

### Epic C — Manual Lap Times
1. **As a user**, I can submit a lap time with track, session, conditions, team, and input device.
2. **As a user**, I can see my lap times list and personal bests.
3. **As a user**, I can delete or hide a lap time (soft delete) from public leaderboard consideration.
4. **As a Champion user**, I can attach telemetry to a lap (via ingestion or upload).

---

### Epic D — Import & Automatic Sync
1. **As a user**, I can link a device/client for automatic upload.
2. **As a client**, I can push sessions/laps in bulk with idempotency.
3. **As a Premium user**, I can see full session detail after import.
4. **As a Champion user**, I can upload telemetry points and later view charts.

---

### Epic E — Sessions & Seasons
1. **As a Premium user**, I can browse sessions by type (practice/qualifying/race/time trial).
2. **As a Premium user**, I can open a session and view classifications, stints, pit stops, and penalties.
3. **As a user**, I can create or import a season and see standings and event results over time.

---

### Epic F — Telemetry (Champion)
1. **As a Champion user**, I can view telemetry for a lap with distance-aligned charts.
2. **As a Champion user**, I can compare two laps side-by-side and see deltas.
3. **As a user**, if I’m not Champion, I can see telemetry availability but I’m prompted to upgrade to view charts.

---

### Epic G — Community Setups
1. **As a user**, I can create and publish a setup for a specific track/game with metadata and setup values.
2. **As a guest**, I can filter setups by condition/team/session/input device. :contentReference[oaicite:45]{index=45}
3. **As a user**, I can edit my setup (versioning) and keep history.
4. **As a moderator/admin**, I can remove abusive setups and users.

---

### Epic H — Leaderboards
1. **As a guest**, I can view top 10 leaderboard entries per track. :contentReference[oaicite:46]{index=46}
2. **As a Champion user**, my eligible laps can appear on leaderboards. :contentReference[oaicite:47]{index=47}
3. **As an admin**, I can invalidate laps (cheating/incorrect mode) and recompute standings.

---

### Epic I — Resources / Data Articles
1. **As a guest**, I can browse resources and open a data article. :contentReference[oaicite:48]{index=48}
2. **As an admin**, I can author an article with embedded charts from aggregated data.

---

### Epic J — Billing & Entitlements
1. **As a user**, I can start a free trial for Premium or Champion.
2. **As a user**, I can upgrade/downgrade and see entitlements change immediately.
3. **As the system**, I enforce storage limits and API access by plan.

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Public pages: TTFB < 300ms (cached), LCP < 2.5s on mobile.
- Telemetry:
  - Retrieve telemetry series for a lap in < 2s for 200k points (with downsampling).
  - Chunked transfer and client-side progressive rendering.

### 8.2 Security
- OWASP ASVS baseline
- Rate limit auth endpoints
- Store passwords with Argon2id or BCrypt
- Signed URLs for telemetry downloads if using object storage
- Audit log for admin actions

### 8.3 Privacy
- Public exposure controls:
  - username display opt-out
  - hide individual laps
- Data retention policies:
  - telemetry retention depends on plan
- GDPR compliance (consent + deletion workflows)

### 8.4 Availability
- Target: 99.9% monthly
- Backups: daily full + binlog for point-in-time recovery

---

## 9. Technical Specifications

## 9.1 Architecture Overview
- **Frontend**: Angular (latest LTS), SSR optional for SEO (Angular Universal).
- **Backend**: Spring Boot (REST API), Spring Security, Spring Data JPA.
- **Database**: MySQL 8.0
- **Cache**: Redis (sessions, rate limits, public page caches)
- **Search** (optional): OpenSearch/Elasticsearch for setups and laps filtering at scale
- **Telemetry storage**:
  - MySQL for metadata + downsampled series
  - Object storage (S3 compatible) for raw telemetry chunks (recommended)
- **Async jobs**: Spring Batch / Quartz + message queue (RabbitMQ/Kafka) for ingestion processing
- **CDN**: for track images and static assets

---

## 9.2 Frontend (Angular) Module Design

### Public modules
- `PublicShellModule`
  - `HomePageComponent`
  - `PricingPageComponent`
- `AiDifficultyModule`
  - `AiTrackListComponent`
  - `AiCalculatorComponent`
- `SetupsModule`
  - `SetupsTrackListComponent`
  - `SetupsTrackComponent` (filters + table)
  - `SetupDetailComponent`
- `LeaderboardModule`
  - `LeaderboardTrackListComponent`
  - `LeaderboardTrackComponent`
- `TracksModule`
  - `TracksListComponent`
  - `TrackGuideComponent`
- `ResourcesModule`
  - `ResourcesListComponent`
  - `ResourceArticleComponent`

### Auth modules
- `AuthModule`
  - `RegisterComponent`
  - `LoginComponent`
  - `ForgotPasswordComponent`

### App (authenticated) modules
- `AppShellModule`
  - `DashboardComponent`
- `LapsModule`
  - `LapCreateComponent`
  - `MyLapsComponent`
- `SessionsModule`
- `SeasonsModule`
- `TelemetryModule`
  - `TelemetryViewerComponent`
  - `TelemetryCompareComponent`
- `AnalyticsModule`
- `AccountModule`
  - `ProfileComponent`
  - `SubscriptionComponent`
  - `PrivacyComponent`
- `ImportModule`
  - `DeviceLinkComponent`
  - `ImportStatusComponent`

### UI patterns
- Filter state in URL query params (deep-linkable)
- Data tables:
  - Server-side pagination
  - Column sort
- Gating:
  - Central `EntitlementGuard` + `*hasEntitlement` directive

---

## 9.3 Backend (Spring Boot) Design

### Services (bounded contexts)
1. **Catalog Service**
   - Games, Tracks, Teams, Track Images, Records
2. **Public Tools Service**
   - AI Difficulty curves, calculators
3. **Community Content Service**
   - Setups, public laps, leaderboards
4. **User Data Service**
   - User laps, sessions, seasons, analytics
5. **Telemetry Service**
   - Storage, downsampling, comparisons
6. **Billing Service**
   - Plans, subscriptions, entitlements, Stripe webhooks
7. **Ingestion Service**
   - Device registration, bulk ingest, validation, idempotency

### Key implementation notes
- Use DTO mapping (MapStruct) and version APIs under `/api/v1`
- Use optimistic locking on user-editable entities (setups, laps)
- Use RBAC + entitlement checks:
  - Role gates admin endpoints
  - Entitlement gates data depth and telemetry

---

## 9.4 API Surface (Representative)

### Public
- `GET /api/v1/public/games`
- `GET /api/v1/public/games/{gameCode}/tracks`
- `GET /api/v1/public/tracks/{gameCode}/{trackSlug}`
- `GET /api/v1/public/setups/{gameCode}/tracks/{trackSlug}?condition=&team=&sessionType=&inputDevice=&page=&size=&sort=`
- `GET /api/v1/public/setups/{gameCode}/{setupId}`
- `GET /api/v1/public/leaderboard/{gameCode}/{trackSlug}`
- `POST /api/v1/public/ai-difficulty/{gameCode}/{trackSlug}/calculate`
- `GET /api/v1/public/resources`
- `GET /api/v1/public/resources/{slug}`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/oauth/{provider}/start`
- `GET /api/v1/auth/oauth/{provider}/callback`

### User
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/me/entitlements`

### Laps
- `POST /api/v1/laps`
- `GET /api/v1/laps?mine=true&track=&game=&from=&to=`
- `GET /api/v1/laps/{lapId}`
- `DELETE /api/v1/laps/{lapId}` (soft delete)
- `POST /api/v1/laps/{lapId}/telemetry/link` (Champion)

### Sessions/Seasons
- `GET /api/v1/sessions`
- `GET /api/v1/sessions/{sessionId}`
- `GET /api/v1/seasons`
- `GET /api/v1/seasons/{seasonId}`

### Telemetry (Champion)
- `GET /api/v1/telemetry/laps/{lapId}/series?channels=speed,throttle,brake&resolution=auto`
- `GET /api/v1/telemetry/compare?lapA=&lapB=&channels=`

### Billing
- `GET /api/v1/billing/plans`
- `POST /api/v1/billing/checkout-session`
- `POST /api/v1/billing/portal-session`
- `POST /api/v1/billing/webhook` (Stripe)

### Ingestion
- `POST /api/v1/ingest/device/register`
- `POST /api/v1/ingest/bulk` (sessions+laps)
- `POST /api/v1/ingest/telemetry/chunk`

---

## 9.5 Database Schema (MySQL 8)

### 9.5.1 Conventions
- All tables use `BIGINT` PK (`id`) unless natural key is essential.
- Timestamps: `created_at`, `updated_at` (UTC).
- Soft deletes: `deleted_at` nullable where needed.
- Use `utf8mb4` collation.

---

### 9.5.2 Core catalog

#### `games`
- `id` PK
- `code` VARCHAR(32) UNIQUE (e.g., `f12025`)
- `display_name` VARCHAR(64) (e.g., “F1 25”)
- `release_date` DATE NULL
- `is_active` BOOLEAN

Indexes:
- `uk_games_code (code)`

#### `tracks`
- `id` PK
- `game_id` FK → games.id
- `slug` VARCHAR(64) (e.g., `australia`) UNIQUE per game
- `country` VARCHAR(64)
- `grand_prix_name` VARCHAR(128)
- `circuit_name` VARCHAR(128)
- `length_km` DECIMAL(6,3)
- `sector_count` TINYINT DEFAULT 3
- `track_image_url` VARCHAR(512)
- `is_reverse` BOOLEAN DEFAULT 0

Indexes:
- `uk_tracks_game_slug (game_id, slug)`
- `ix_tracks_game (game_id)`

#### `track_records`
- `id` PK
- `track_id` FK → tracks.id
- `record_type` ENUM('F1_LAP_RECORD','ESPORTS_TIME_TRIAL')
- `lap_time_ms` INT
- `holder` VARCHAR(128) NULL
- `record_date` DATE NULL
- `source_url` VARCHAR(512) NULL

Indexes:
- `ix_track_records_track_type (track_id, record_type)`

#### `teams`
- `id` PK
- `game_id` FK → games.id
- `code` VARCHAR(64)
- `name` VARCHAR(128)
- `category` ENUM('F1','F2','CUSTOM')
- `is_active` BOOLEAN

Indexes:
- `uk_teams_game_code (game_id, code)`

---

### 9.5.3 Users & auth

#### `users`
- `id` PK
- `email` VARCHAR(255) UNIQUE
- `username` VARCHAR(64) UNIQUE
- `password_hash` VARCHAR(255) NULL (null if oauth-only)
- `display_username_public` BOOLEAN DEFAULT 1
- `status` ENUM('ACTIVE','SUSPENDED','DELETED') DEFAULT 'ACTIVE'
- `created_at`, `updated_at`

#### `oauth_accounts`
- `id` PK
- `user_id` FK → users.id
- `provider` ENUM('GOOGLE','DISCORD')
- `provider_user_id` VARCHAR(128)
- `created_at`

Indexes:
- `uk_oauth_provider_user (provider, provider_user_id)`
- `ix_oauth_user (user_id)`

#### `user_sessions` (optional if not using stateless JWT-only)
- `id` PK
- `user_id` FK
- `refresh_token_hash` VARCHAR(255)
- `expires_at` DATETIME
- `created_at`

---

### 9.5.4 Billing & entitlements

#### `plans`
- `id` PK
- `code` ENUM('FREE','PREMIUM','CHAMPION') UNIQUE
- `display_name` VARCHAR(64)
- `telemetry_enabled` BOOLEAN
- `leaderboard_eligible` BOOLEAN
- `session_depth` ENUM('BASIC','FULL')
- `created_at`, `updated_at`

#### `subscriptions`
- `id` PK
- `user_id` FK
- `plan_id` FK
- `provider` ENUM('STRIPE')
- `provider_customer_id` VARCHAR(128)
- `provider_subscription_id` VARCHAR(128)
- `status` ENUM('TRIALING','ACTIVE','PAST_DUE','CANCELED','INCOMPLETE')
- `current_period_start` DATETIME
- `current_period_end` DATETIME
- `cancel_at_period_end` BOOLEAN
- `created_at`, `updated_at`

Indexes:
- `ix_subscriptions_user (user_id)`
- `uk_subscriptions_provider_sub (provider_subscription_id)`

---

### 9.5.5 Community setups

#### `setups`
- `id` BIGINT PK
- `game_id` FK
- `track_id` FK
- `user_id` FK
- `team_id` FK NULL (allow custom/free-text team; store resolved when possible)
- `team_name` VARCHAR(128) NULL
- `session_type` ENUM('TIME_TRIAL','RACE')
- `condition_type` ENUM('DRY','WET','MIXED')
- `input_device` ENUM('CONTROLLER','WHEEL')
- `lap_time_ms` INT NULL
- `setup_name` VARCHAR(128) NULL
- `is_public` BOOLEAN DEFAULT 1
- `created_at`, `updated_at`, `deleted_at`

Indexes:
- `ix_setups_track_filters (game_id, track_id, condition_type, session_type, input_device)`
- `ix_setups_track_laptime (game_id, track_id, lap_time_ms)`
- `ix_setups_user (user_id)`

#### `setup_templates`
Defines schema per game (fields and validation).
- `id` PK
- `game_id` FK
- `version` INT
- `template_json` JSON (field list, min/max, units, sections)
- `created_at`

#### `setup_values`
Stores actual values (flexible per template).
- `id` PK
- `setup_id` FK → setups.id
- `template_id` FK → setup_templates.id
- `values_json` JSON (e.g., `{ "aero.frontWing": 23, ... }`)
- `created_at`

---

### 9.5.6 Laps & leaderboards

#### `laps`
- `id` PK
- `game_id` FK
- `track_id` FK
- `user_id` FK
- `team_id` FK NULL
- `team_name` VARCHAR(128) NULL
- `session_type` ENUM('TIME_TRIAL','PRACTICE','QUALIFYING','SPRINT','RACE')
- `condition_type` ENUM('DRY','WET','MIXED')
- `input_device` ENUM('CONTROLLER','WHEEL')
- `lap_time_ms` INT NOT NULL
- `lap_date` DATE NULL
- `is_valid` BOOLEAN DEFAULT 1
- `validation_reason` VARCHAR(255) NULL
- `has_telemetry` BOOLEAN DEFAULT 0
- `visibility` ENUM('PUBLIC','PRIVATE') DEFAULT 'PUBLIC'
- `source` ENUM('MANUAL','INGESTED') DEFAULT 'MANUAL'
- `external_source` VARCHAR(64) NULL
- `external_id` VARCHAR(128) NULL
- `created_at`, `updated_at`, `deleted_at`

Indexes:
- `ix_laps_track_tt (game_id, track_id, session_type, is_valid, lap_time_ms)`
- `ix_laps_user (user_id, created_at)`
- `uk_laps_external (external_source, external_id)` (nullable uniqueness via app logic)

#### `leaderboard_snapshots` (optional precompute)
- `id` PK
- `game_id` FK
- `track_id` FK
- `computed_at` DATETIME
- `entries_json` JSON (top 10 lap IDs + ranks)
- `created_at`

---

### 9.5.7 Sessions & seasons

#### `seasons`
- `id` PK
- `user_id` FK
- `game_id` FK
- `season_type` ENUM('CAREER','MYTEAM','CHAMPIONSHIP','CUSTOM')
- `name` VARCHAR(128)
- `start_date` DATE NULL
- `end_date` DATE NULL
- `created_at`, `updated_at`

#### `season_events`
- `id` PK
- `season_id` FK
- `round_number` INT
- `track_id` FK
- `event_date` DATE NULL
- `created_at`

Indexes:
- `uk_season_round (season_id, round_number)`

#### `sessions`
- `id` PK
- `user_id` FK
- `game_id` FK
- `track_id` FK
- `season_event_id` FK NULL
- `session_type` ENUM('PRACTICE','QUALIFYING','SPRINT','RACE','TIME_TRIAL')
- `started_at` DATETIME NULL
- `ended_at` DATETIME NULL
- `weather_json` JSON NULL
- `created_at`, `updated_at`
- `external_source`, `external_id` (for ingestion)

Indexes:
- `ix_sessions_user_date (user_id, started_at)`
- `ix_sessions_season_event (season_event_id)`

#### `session_results`
- `id` PK
- `session_id` FK
- `position` INT
- `driver_name` VARCHAR(128)
- `team_name` VARCHAR(128)
- `points` DECIMAL(6,2) NULL
- `total_time_ms` INT NULL
- `status` VARCHAR(64) NULL
- `created_at`

#### `tyre_stints`
- `id` PK
- `session_id` FK
- `stint_number` INT
- `compound` ENUM('SOFT','MEDIUM','HARD','INTER','WET')
- `lap_start` INT
- `lap_end` INT
- `pit_stop_lap` INT NULL
- `created_at`

#### `penalties`
- `id` PK
- `session_id` FK
- `lap_number` INT NULL
- `penalty_type` VARCHAR(64)
- `time_penalty_ms` INT NULL
- `details` VARCHAR(255) NULL
- `created_at`

---

### 9.5.8 Telemetry (Champion)

#### `telemetry_laps`
- `id` PK
- `lap_id` FK → laps.id UNIQUE
- `storage_mode` ENUM('MYSQL','OBJECT')
- `sample_rate_hz` INT NULL
- `point_count` INT
- `distance_m` INT NULL
- `channels_mask` BIGINT (bitset) NULL
- `created_at`

#### `telemetry_chunks`
For object storage or chunked DB storage.
- `id` PK
- `telemetry_lap_id` FK
- `chunk_index` INT
- `start_index` INT
- `end_index` INT
- `object_url` VARCHAR(512) NULL
- `data_blob` LONGBLOB NULL
- `created_at`

Indexes:
- `uk_telemetry_chunk (telemetry_lap_id, chunk_index)`

#### `telemetry_downsampled`
- `id` PK
- `telemetry_lap_id` FK
- `resolution` ENUM('LOW','MED','HIGH')
- `data_json` JSON (arrays per channel, already aligned by distance)
- `created_at`

---

### 9.5.9 Resources CMS

#### `resources`
- `id` PK
- `slug` VARCHAR(128) UNIQUE
- `title` VARCHAR(255)
- `summary` VARCHAR(512) NULL
- `content_markdown` MEDIUMTEXT
- `published_at` DATETIME NULL
- `status` ENUM('DRAFT','PUBLISHED') DEFAULT 'DRAFT'
- `created_at`, `updated_at`

---

## 10. Key Domain Rules

### 10.1 Lap validity (leaderboard)
- Only laps with:
  - `session_type = TIME_TRIAL`
  - `is_valid = true`
  - (optional) `equal_performance = true` if modeled
  - (Champion rule) `has_telemetry = true` if leaderboard requires telemetry
- Display top 10 by `lap_time_ms` ascending; tiebreaker by earliest date.

### 10.2 Setup visibility
- Public setups visible to guests.
- Users can mark setups private.
- Admin can remove content.

### 10.3 Plan enforcement
- API responses should degrade gracefully:
  - Non-eligible users receive 403 with `requiredPlan`.
  - Public pages show locked state with upgrade CTA.

---

## 11. Data Migration / Seeding
- Seed `games` for supported versions (F1 2020…F1 25).
- Seed `tracks` per game with slugs and base metadata.
- Seed `teams` list per game.
- Seed `track_records` (F1 and esports lap record values) per track. (Maintain admin tools to update.)

---

## 12. Admin Tools (Minimum)
- CRUD: games, tracks, teams
- AI difficulty curves editor:
  - anchor points UI, preview interpolation, publish version
- Moderation: users, laps, setups (invalidate/remove)
- Resource articles editor (markdown + preview)
- Billing overview (read-only mirrored from Stripe)

---

## 13. Testing Strategy
- Unit tests:
  - AI difficulty interpolation
  - lap time parsing/normalization
  - leaderboard ranking logic
- Integration tests:
  - ingestion idempotency
  - entitlement gating
- E2E (Cypress/Playwright):
  - browse setups with filters
  - calculate AI difficulty
  - view leaderboard track page
  - register → redirect back to lap submission

---

## 14. Delivery Checklist (MVP)
1. Public:
   - Tracks list + track guide
   - Setups list + setup detail + filtering
   - Leaderboard list + track leaderboard
   - AI difficulty calculator (curve-based)
   - Pricing page
   - Resources list + article
2. Auth:
   - Register/login/forgot password
3. Basic user:
   - Manual lap submission + “my laps”
4. Billing:
   - Plans + entitlements + Stripe checkout
5. Champion:
   - Telemetry ingestion + viewer (at least speed/throttle/brake + delta)

---
