# F1Sets

## User Stories — Technical Breakdown (DTOs, APIs, Contracts, Rules)

This document **fully decomposes every epic and user story** into:

- Backend endpoints (Spring Boot)
- Request / response DTOs
- Validation rules
- Authorization & entitlement checks
- Persistence touchpoints
- Frontend (Angular) integration notes
- Edge cases & non-happy paths

A developer should be able to implement **directly from this document** without additional design work.

---

# GLOBAL TECHNICAL CONVENTIONS

## API

- Base path: `/api/v1`
- REST + JSON
- ISO-8601 timestamps (UTC)
- Lap times always in **milliseconds (int)** in backend
- Pagination:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 153,
  "totalPages": 8
}
````

## Auth

* JWT access token (15 min)
* Refresh token (httpOnly cookie)
* `Authorization: Bearer <token>`

## Error Format

```json
{
  "timestamp": "2025-01-01T12:00:00Z",
  "status": 403,
  "error": "FORBIDDEN",
  "message": "Telemetry access requires Champion plan",
  "code": "PLAN_REQUIRED",
  "requiredPlan": "CHAMPION"
}
```

---

# EPIC A — PUBLIC DISCOVERY

---

## Story A1 — Browse Track List

### Endpoint

`GET /public/games/{gameCode}/tracks`

### Response DTO

```json
{
  "gameCode": "f12025",
  "tracks": [
    {
      "id": 12,
      "slug": "australia",
      "grandPrixName": "Australian Grand Prix",
      "circuitName": "Albert Park Circuit",
      "lengthKm": 5.278,
      "hasSetups": true,
      "hasLeaderboard": true,
      "hasAiDifficulty": true,
      "trackImageUrl": "https://cdn.app/tracks/australia.png"
    }
  ]
}
```

### Backend

* Tables: `games`, `tracks`
* Cache: Redis (24h)
* Sort: Alphabetical by GP name

### Frontend

* Track grid
* Each card links to:

    * `/tracks/{game}/{slug}`
    * `/setups/{game}/tracks/{slug}`
    * `/ai-difficulty-calculator/{game}/{slug}`
    * `/laptimes/leaderboard/{game}/{slug}`

---

## Story A2 — Track Guide Page

### Endpoint

`GET /public/tracks/{gameCode}/{trackSlug}`

### Response DTO

```json
{
  "track": {
    "id": 12,
    "grandPrixName": "Australian Grand Prix",
    "circuitName": "Albert Park Circuit",
    "lengthKm": 5.278,
    "sectorCount": 3,
    "imageUrl": "https://cdn.app/tracks/australia.png"
  },
  "records": {
    "f1LapRecordMs": 76345,
    "esportsLapRecordMs": 74210
  },
  "actions": {
    "setupsUrl": "/setups/f12025/tracks/australia",
    "aiDifficultyUrl": "/ai-difficulty-calculator/f12025/australia",
    "leaderboardUrl": "/laptimes/leaderboard/f12025/australia",
    "addLapRequiresAuth": true
  }
}
```

### Validation

* 404 if track not found for game

---

# EPIC B — AI DIFFICULTY CALCULATOR

---

## Story B1 — Calculate AI Difficulty

### Endpoint

`POST /public/ai-difficulty/{gameCode}/{trackSlug}/calculate`

### Request DTO

```json
{
  "lapTimeMs": 74321
}
```

### Validation

* `lapTimeMs > 0`
* `< maxLapTimeMs` (config per track)

### Response DTO

```json
{
  "difficulty": 102,
  "confidence": {
    "min": 100,
    "max": 104
  },
  "curveVersion": 3,
  "notes": "Calculated using Equal Performance Time Trial curve"
}
```

### Backend Logic

* Load curve from `ai_difficulty_curves`
* Piecewise linear interpolation
* Clamp outside range
* Store calculation metrics (optional analytics)

---

# EPIC C — SETUPS

---

## Story C1 — Browse Setups for Track

### Endpoint

`GET /public/setups/{gameCode}/tracks/{trackSlug}`

### Query Params

```
condition=DRY
sessionType=TIME_TRIAL
inputDevice=CONTROLLER
teamIds=1,2,3
page=0
size=20
sort=lapTimeMs,asc
```

### Response DTO

```json
{
  "content": [
    {
      "setupId": 991,
      "username": "FastDriver",
      "teamName": "Red Bull",
      "sessionType": "TIME_TRIAL",
      "condition": "DRY",
      "inputDevice": "CONTROLLER",
      "lapTimeMs": 74210,
      "createdAt": "2025-01-10T10:22:00Z"
    }
  ],
  "page": 0,
  "totalElements": 56
}
```

### Backend

* Table: `setups`
* Index: `(game_id, track_id, condition_type, session_type, input_device)`
* Soft deletes excluded

---

## Story C2 — View Setup Detail

### Endpoint

`GET /public/setups/{gameCode}/{setupId}`

### Response DTO

```json
{
  "setup": {
    "id": 991,
    "user": {
      "username": "FastDriver"
    },
    "metadata": {
      "track": "Australia",
      "team": "Red Bull",
      "sessionType": "TIME_TRIAL",
      "condition": "DRY",
      "inputDevice": "CONTROLLER",
      "lapTimeMs": 74210,
      "createdAt": "2025-01-10T10:22:00Z"
    },
    "values": {
      "aero": {
        "frontWing": 23,
        "rearWing": 19
      },
      "transmission": {
        "onThrottle": 55,
        "offThrottle": 50
      },
      "suspensionGeometry": {
        "frontCamber": -2.5,
        "rearCamber": -1.2
      },
      "brakes": {
        "pressure": 100,
        "bias": 54
      },
      "tyres": {
        "frontLeft": 22.5,
        "frontRight": 22.5,
        "rearLeft": 20.8,
        "rearRight": 20.8
      }
    }
  }
}
```

### Backend

* Join `setups` → `setup_values`
* Validate template version compatibility

---

# EPIC D — AUTH & ACCOUNT

---

## Story D1 — Register User

### Endpoint

`POST /auth/register`

### Request DTO

```json
{
  "email": "user@email.com",
  "username": "FastDriver",
  "password": "StrongPassword123"
}
```

### Validation

* Email unique
* Username unique
* Password ≥ 8 chars

### Response

```json
{
  "userId": 441,
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Backend

* Hash password (Argon2id)
* Create user
* Assign FREE plan

---

## Story D2 — Login

### Endpoint

`POST /auth/login`

### Request

```json
{
  "login": "FastDriver",
  "password": "StrongPassword123"
}
```

---

# EPIC E — LAP TIMES

---

## Story E1 — Submit Lap Time (Manual)

### Endpoint

`POST /laps`

### Auth

* Required

### Request DTO

```json
{
  "gameCode": "f12025",
  "trackSlug": "australia",
  "sessionType": "TIME_TRIAL",
  "condition": "DRY",
  "inputDevice": "CONTROLLER",
  "teamId": 3,
  "lapTimeMs": 74210,
  "lapDate": "2025-01-15",
  "visibility": "PUBLIC"
}
```

### Validation

* Prevent duplicates (±5 ms same track)
* SessionType TIME_TRIAL required for leaderboard
* Check entitlements

### Response

```json
{
  "lapId": 8821,
  "leaderboardEligible": true
}
```

---

## Story E2 — View My Laps

### Endpoint

`GET /laps?mine=true`

### Response

```json
{
  "content": [
    {
      "lapId": 8821,
      "track": "Australia",
      "lapTimeMs": 74210,
      "rank": 7,
      "hasTelemetry": false
    }
  ]
}
```

---

# EPIC F — LEADERBOARDS

---

## Story F1 — Track Leaderboard

### Endpoint

`GET /public/leaderboard/{gameCode}/{trackSlug}`

### Response

```json
{
  "track": "Australia",
  "entries": [
    {
      "rank": 1,
      "lapId": 1002,
      "username": "Alien",
      "lapTimeMs": 73111,
      "team": "Ferrari",
      "inputDevice": "WHEEL",
      "hasTelemetry": true,
      "date": "2025-01-11"
    }
  ]
}
```

### Rules

* Only top 10
* Only valid laps
* Only Champion if telemetry required

---

# EPIC G — TELEMETRY (CHAMPION)

---

## Story G1 — View Telemetry

### Endpoint

`GET /telemetry/laps/{lapId}/series`

### Auth

* Champion required

### Query

```
channels=speed,throttle,brake
resolution=MED
```

### Response DTO

```json
{
  "lapId": 1002,
  "distanceAxis": [
    0,
    10,
    20,
    30
  ],
  "series": {
    "speed": [
      0,
      120,
      240,
      310
    ],
    "throttle": [
      0,
      0.8,
      1.0,
      0.6
    ],
    "brake": [
      1.0,
      0.0,
      0.0,
      0.4
    ]
  }
}
```

### Backend

* Load from `telemetry_downsampled`
* If missing → compute and cache

---

## Story G2 — Compare Telemetry

### Endpoint

`GET /telemetry/compare`

### Query

```
lapA=1002
lapB=1044
channels=speed,delta
```

### Response

```json
{
  "laps": [
    {
      "lapId": 1002,
      "label": "PB"
    },
    {
      "lapId": 1044,
      "label": "Reference"
    }
  ],
  "distanceAxis": [
    ...
  ],
  "series": {
    "speed": {
      "lapA": [
        ...
      ],
      "lapB": [
        ...
      ]
    },
    "delta": {
      "lapA": [
        0,
        -0.12,
        -0.25
      ],
      "lapB": [
        0,
        0,
        0
      ]
    }
  }
}
```

---

# EPIC H — BILLING & ENTITLEMENTS

---

## Story H1 — Get Plans

### Endpoint

`GET /billing/plans`

### Response

```json
[
  {
    "code": "FREE",
    "priceMonthly": 0,
    "features": [
      "Basic lap tracking"
    ]
  },
  {
    "code": "CHAMPION",
    "priceMonthly": 9.99,
    "features": [
      "Telemetry",
      "Leaderboards"
    ]
  }
]
```

---

## Story H2 — Checkout

### Endpoint

`POST /billing/checkout-session`

### Request

```json
{
  "planCode": "CHAMPION",
  "billingPeriod": "MONTHLY"
}
```

### Response

```json
{
  "checkoutUrl": "https://stripe.com/..."
}
```

---

# EPIC I — INGESTION

---

## Story I1 — Bulk Session Import

### Endpoint

`POST /ingest/bulk`

### Auth

* Device token

### Request DTO

```json
{
  "source": "PC_CLIENT",
  "sessions": [
    {
      "externalId": "session-uuid",
      "track": "australia",
      "type": "RACE",
      "laps": [
        {
          "externalId": "lap-1",
          "lapTimeMs": 75211
        }
      ]
    }
  ]
}
```

### Backend

* Idempotency via `(external_source, external_id)`
* Async processing
* Partial success allowed

---

