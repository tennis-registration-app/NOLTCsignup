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

## Admin BlockManager Decomposition (Phase 2.2)

The `CompleteBlockManagerEnhanced.jsx` component (~1,076 lines) was decomposed into bounded modules for maintainability.

### Extracted Modules

| Module | Type | Location | Responsibility |
|--------|------|----------|----------------|
| `useWetCourts` | Hook | `src/admin/blocks/hooks/useWetCourts.js` | Wet court API handlers (markWet, clear, deactivate). Parent owns state, hook provides handlers. |
| `CourtSelectionGrid` | Component | `src/admin/blocks/CourtSelectionGrid.jsx` | Presentational 12-court selection grid. Parent owns selection state and toggle logic. |
| `BlockReasonSelector` | Component | `src/admin/blocks/BlockReasonSelector.jsx` | Presentational quick-reason buttons + custom input. Owns `quickReasons` data (UI-only). |
| `expandRecurrenceDates` | Utility | `src/admin/blocks/utils/expandRecurrenceDates.js` | Pure function: expands recurrence config into `{date: Date}[]`. No side effects. |

### Ownership Model

- **State ownership:** Parent component (`CompleteBlockManagerEnhanced`) retains all state
- **Handler pattern:** `useWetCourts` receives setters as props, returns handler functions
- **Presentational components:** Receive data + callbacks via props, no internal state
- **Pure utilities:** No React dependencies, testable in isolation

### Post-Decomposition Metrics

- Original: 1,076 lines
- Current: 832 lines (~23% reduction)
- Extracted: 363 lines across 4 modules

## Courtboard Module Structure (WP4 Phase 1)

```
src/courtboard/
├── main.jsx                    # Thin entry point (≤500 lines target met)
├── bridge/
│   └── window-bridge.js        # Single writer for window.CourtboardState
├── components/
│   ├── CourtCard.jsx           # Individual court display
│   ├── Icons.jsx               # Shared icon components
│   ├── LoadingPlaceholder.jsx  # Loading state
│   ├── NextAvailablePanel.jsx  # Next available courts panel
│   ├── ReservedCourtsPanel.jsx # Reserved courts panel
│   ├── TennisCourtDisplay.jsx  # Main court grid (state owner)
│   ├── ToastHost.jsx           # Toast notifications
│   └── WaitingList.jsx         # Waitlist display
├── mobile/
│   ├── MobileModalApp.jsx      # Mobile app shell
│   └── MobileModalSheet.jsx    # Mobile modal content
├── utils/
│   └── courtUtils.js           # Shared helper functions
└── Existing supporting modules (unchanged):
    ├── browser-bridge.js       # window.CourtAvailability export
    ├── courtboardState.js      # State reading helpers
    ├── mobile-bridge.js        # Mobile communication
    ├── mobile-fallback-bar.js  # Fallback UI
    ├── debug-panel.js          # Debug utilities
    └── sync-promotions.js      # Promotion sync
```

### Key Architectural Patterns

- **Single Writer**: `window.CourtboardState` is written ONLY by `bridge/window-bridge.js`
- **State Owner**: `TennisCourtDisplay.jsx` owns React state and calls bridge to sync
- **Mobile Shell**: `mobile/` components handle mobile-specific UI
- **Pure Extraction**: All components extracted without behavior changes

### Verification Baseline

Playwright baseline is currently 14/15 due to pre-existing failure in `block-refresh-wiring.spec.js` (to be addressed in WP5 Cleanup).

## Admin Module Structure (WP4 Phase 2)

```
src/admin/
├── App.jsx                     # Entry point + AdminPanelV2 (~792 lines)
├── handlers/
│   ├── applyBlocksOperation.js # Block creation logic
│   ├── courtOperations.js      # Clear/move court operations
│   └── waitlistOperations.js   # Waitlist management
├── tabs/
│   ├── AIAssistantSection.jsx  # AI assistant floating panel
│   ├── AnalyticsSection.jsx    # Analytics tab content
│   ├── BlockingSection.jsx     # Block management tab
│   ├── CalendarSection.jsx     # Calendar tab content
│   ├── HistorySection.jsx      # Game history tab
│   ├── StatusSection.jsx       # Court status tab
│   ├── SystemSection.jsx       # System settings tab
│   ├── TabNavigation.jsx       # Tab bar navigation
│   └── WaitlistSection.jsx     # Waitlist tab content
├── utils/
│   ├── adminRefresh.js         # Refresh coalescer utilities (extracted IIFEs)
│   └── eventIcons.js           # Event icon helper
├── screens/                    # Existing (AnalyticsDashboard, GameHistorySearch, SystemSettings)
├── blocks/                     # Existing (CompleteBlockManagerEnhanced, etc.)
├── calendar/                   # Existing (EventCalendarEnhanced, etc.)
├── analytics/                  # Existing (UsageHeatmap, UtilizationChart, etc.)
├── courts/                     # Existing (CourtStatusGrid)
├── ai/                         # Existing (AIAssistant, MockAIAdmin)
└── components/                 # Existing + extracted (VisualTimeEntry, MiniCalendar, MonthView, EventSummary)
```

### Key Architectural Patterns

- **Handler modules**: Pure async functions with dependency injection (`ctx` parameter). No React hooks or state.
- **Tab sections**: Render-only components. All handlers passed as props from AdminPanelV2.
- **State ownership**: AdminPanelV2 owns all React state and delegates rendering to tab components.
- **Refresh contract**: `window.refreshAdminView` remains assigned in App.jsx; used by refresh utilities and test wiring.

### Why App.jsx Remains ~792 Lines

Reaching ≤500 lines requires refactoring beyond WP4 scope:
- `loadData` + subscription effects are tightly coupled to multiple state setters
- Wet-court handler cluster (`handleEmergencyWetCourt`, `deactivateWetCourts`, `clearWetCourt`) couples 7+ state setters
- Further reduction requires hooks/state modularization (WP5+)

### Verification Baseline

Playwright baseline is 14/15 due to pre-existing failure in `block-refresh-wiring.spec.js` (to be addressed in WP5).

## Known Technical Debt

### Hardcoded Credentials (Phase 4)

The frontend currently contains hardcoded Supabase credentials in `src/lib/apiConfig.js`. This is documented and will be addressed in Phase 4 (Backend Hygiene & Security) by:
- Moving credentials to environment variables
- Creating `.env.example` template
- Updating build/deploy pipeline

### Frontend Decomposition (Phase 2) - Partially Complete

Large components status:
- `src/registration/App.jsx` (~1,815 lines) - 7 hooks extracted in Phase 2.1
- `CompleteBlockManagerEnhanced.jsx` (~832 lines) - Decomposed in Phase 2.2

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
