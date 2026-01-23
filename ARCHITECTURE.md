# NOLTC Tennis Registration System — Architecture

## Overview

The NOLTC Tennis Registration System manages court registration for approximately 2,500 members across 12 courts at the New Orleans Lawn Tennis Club. The system consists of multiple frontend applications backed by Supabase (PostgreSQL + Edge Functions).

## Repository Structure

This is a **two-repository system**:

| Repository | Contents | Deployment |
|------------|----------|------------|
| `NOLTCsignup/` (this repo) | Frontend applications (React/Vite) | GitHub Pages |
| `noltc-backend/` | Supabase Edge Functions + migrations | Supabase |

## Frontend Applications

The frontend is a multi-page Vite application with four entry points:

| App | Path | Purpose |
|-----|------|---------|
| Registration | `/src/registration/` | Member check-in kiosk (iPad) |
| Courtboard | `/src/courtboard/` | Passive court status display |
| Admin | `/src/admin/` | Analytics, settings, blocks, calendar |
| Mobile | `/Mobile.html` | Mobile shell (iframe-based) |

### Shared Code

- `src/lib/` — API client, realtime subscriptions, utilities
- `src/shared/` — Shared React components
- `shared/` — Cross-app utilities
- `domain/` — Domain logic and constants

## Architectural Principles

### 1. Backend-Authoritative

All domain state lives in the database. The frontend is a view layer that:
- Reads state via API calls or realtime subscriptions
- Mutates state **only** through Edge Function calls
- Never stores domain state in localStorage (localStorage is for UI preferences only)

### 2. Edge Functions as Mutation Layer

All data mutations go through Supabase Edge Functions. The frontend never writes directly to the database. This ensures:
- Consistent business rule enforcement
- Audit logging at the mutation boundary
- Atomic operations for complex workflows

### 3. Realtime State Propagation

Court status updates propagate via:
1. **Primary:** Supabase Realtime subscriptions (signals table)
2. **Fallback:** Polling (for environments where websockets are unreliable)

When a mutation occurs, the Edge Function writes to the signals table, which triggers realtime updates to all connected clients.

### 4. Event-Sourced Sessions

Court sessions maintain history:
- Active sessions represent current court state
- Completed sessions are archived with timestamps
- Session transitions (start, end, transfer) are recorded

## Data Flow

```
┌─────────────┐     HTTP POST      ┌─────────────────┐
│   Frontend  │ ─────────────────> │  Edge Function  │
│  (React)    │                    │  (Deno)         │
└─────────────┘                    └────────┬────────┘
       ▲                                    │
       │                                    ▼
       │ Realtime              ┌─────────────────────┐
       │ Subscription          │     PostgreSQL      │
       │                       │  (Supabase)         │
       └───────────────────────┴─────────────────────┘
```

## Key Backend Patterns

### API Response Format

All Edge Functions return consistent response format:
```javascript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Error message", code: "ERROR_CODE" }
```

### Audit Logging

Mutations are logged with:
- Timestamp
- Action type
- Actor (device/admin)
- Before/after state (where applicable)

## Known Technical Debt

### Hardcoded Credentials (Phase 4)

The frontend currently contains hardcoded Supabase credentials in `src/lib/apiConfig.js`. This is documented and will be addressed in Phase 4 (Backend Hygiene & Security) by:
- Moving credentials to environment variables
- Creating `.env.example` template
- Updating build/deploy pipeline

### Frontend Decomposition (Phase 2)

Large components pending decomposition:
- `src/registration/App.jsx` (~2,300 lines)
- `CompleteBlockManagerEnhanced.jsx` (~1,000 lines)

## Security Model

### Current State
- Device authentication trusts client-supplied IDs
- Supabase anon key used for all frontend requests

### Planned Improvements (Phase 4)
- Signed device authentication (JWT/HMAC)
- Request validation at Edge Function boundary

## Related Documentation

- [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) — Environment setup and staging
- [docs/GOLDEN_FLOWS.md](./docs/GOLDEN_FLOWS.md) — Critical user flows
- [docs/TESTING.md](./docs/TESTING.md) — Testing strategy
