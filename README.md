# F1Sets
**Angular + Spring Boot + MySQL**

This repository contains the **complete product, functional, and technical specifications** required to build a web application inspired by **F1Laps**.  
It is intentionally **over-documented** so engineering teams can implement features without additional product discovery or clarification.

---

## 📦 Repository Contents

### 1. Functional & Technical Specifications
**File:** `SPECIFICATIONS.md`

This document defines **what to build** and **how the system behaves** at a high level.

Includes:
- Product goals & non-goals
- Public features (AI difficulty calculator, setups, leaderboards, track guides, resources)
- Authenticated features (laps, sessions, seasons, telemetry, analytics)
- Subscription tiers & entitlements
- Non-functional requirements (performance, security, privacy)
- Full system architecture (Angular + Spring Boot)
- Database schema (MySQL 8)
- Admin tooling requirements
- Testing strategy
- MVP delivery checklist

This file should be treated as the **source of truth for system behavior**.

---

### 2. User Stories — Technical Breakdown
**File:** `f1laps-user-stories-technical-details.md`

This document defines **exactly how to implement every user story**.

Includes:
- All epics and user stories
- REST endpoints per story
- Request / response DTOs
- Validation rules
- Authorization & subscription gating
- Backend persistence notes
- Frontend integration expectations
- Error handling contracts

This file is meant to be used **directly by developers** during implementation.

---

## 🏗️ Target Architecture

### Frontend
- **Angular (latest LTS)**
- Modular feature architecture
- SSR optional (SEO-driven public pages)
- Route guards based on entitlements
- Telemetry visualization using charting libraries (distance-based data)

### Backend
- **Spring Boot**
- Spring Security (JWT + OAuth)
- REST API (`/api/v1`)
- Layered architecture:
    - Controllers
    - Services
    - Domain
    - Repositories (JPA)
- Async ingestion pipelines for telemetry & sessions

### Database
- **MySQL 8**
- Normalized core entities
- JSON columns where schema flexibility is required (telemetry, setup templates)
- Indexed for leaderboard & track queries

### Optional Infrastructure
- Redis (caching, rate limiting)
- Object storage (telemetry blobs)
- Stripe (billing)
- Message queue (ingestion processing)

---

## 👥 Intended Audience

This repository is written for:
- Backend engineers (Spring Boot / JPA)
- Frontend engineers (Angular)
- Data engineers (telemetry & analytics)
- Tech leads / architects
- QA engineers
- DevOps / platform engineers

No product manager input is required beyond this documentation.

---

## 🚀 How to Use These Specs

### Recommended Workflow
1. **Read the Functional & Technical Specifications first**
    - Understand scope, modules, and domain rules
2. **Implement epic-by-epic**
    - Use the User Stories Technical Breakdown as your task definition
3. **Frontend and backend work in parallel**
    - DTOs and endpoints are fully specified
4. **Do not invent behavior**
    - If it’s not specified, it’s intentionally out of scope

---

## 🔐 Subscription Model (Summary)

| Plan       | Access |
|-----------|--------|
| Free      | Basic lap tracking, public browsing |
| Premium   | Full sessions, seasons, analytics |
| Champion  | Telemetry, lap comparisons, leaderboard eligibility |

All entitlement enforcement rules are defined in the specs.

---

## 🧪 Quality & Testing Expectations

- Unit tests for:
    - AI difficulty interpolation
    - Leaderboard ranking
    - Lap validation
- Integration tests for:
    - Ingestion idempotency
    - Subscription gating
- E2E tests for:
    - Public browsing
    - Registration → redirect flows
    - Telemetry gating

---
