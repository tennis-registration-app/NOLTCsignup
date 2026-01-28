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

## Registration Module Structure (WP4 Phase 3)

```
src/registration/
├── App.jsx                     # Entry point + TennisRegistration (~3,491 lines)
├── handlers/
│   └── adminOperations.js      # Admin operations (274 lines, 8 exported ops)
├── screens/                    # Already extracted (6 screens, 2,817 lines)
│   ├── HomeScreen.jsx          # Home/search screen (259 lines)
│   ├── GroupScreen.jsx         # Group management (680 lines)
│   ├── CourtSelectionScreen.jsx # Court selection (206 lines)
│   ├── ClearCourtScreen.jsx    # Court clearing flow (279 lines)
│   ├── AdminScreen.jsx         # Admin interface (715 lines)
│   └── SuccessScreen.jsx       # Success/completion (678 lines)
├── components/                 # UI components (696 lines)
├── hooks/                      # Custom hooks (278 lines)
├── modals/                     # Modal components (86 lines)
├── backend/                    # Backend API layer (~500 lines)
├── services/                   # Business services (~400 lines)
├── context/                    # React context (~100 lines)
└── utils/                      # Utility functions (~50 lines)
```

### Key Architectural Patterns

- **Handler modules**: Pure async functions with dependency injection (`ctx` parameter). 8 admin operations extracted to `handlers/adminOperations.js`.
- **Screen components**: Already extracted prior to WP4. Each screen receives props from TennisRegistration.
- **State ownership**: TennisRegistration owns all React state (73 useState declarations) and assembles props for screens.

### Why App.jsx Remains ~3,491 Lines

The screens are already extracted (2,817 lines in 6 files). The remaining ~3,491 lines in App.jsx is primarily:
- **State declarations**: 73 useState hooks for form, UI, and flow state
- **State orchestration**: Handlers that coordinate multiple state updates
- **Prop assembly**: Building prop objects to pass to extracted screens

Specific blockers for further WP4 extraction:
- `assignCourtToGroup` (370 lines) orchestrates 20+ state setters
- `resetForm` / `clearSuccessResetTimer` touch 38 setters each
- Navigation flows (`handleGroupGoBack`, etc.) couple 5-10 setters

Further reduction requires architectural refactoring (WP5+):
- State consolidation into domain-specific hooks (e.g., `useGroupState`, `useWaitlistState`)
- Context-based state management to eliminate prop drilling
- Potential state machine pattern for complex registration flows

### Verification Baseline

Playwright baseline is 14/15 due to pre-existing failure in `block-refresh-wiring.spec.js` (to be addressed in WP5).

## Known Technical Debt

### Hardcoded Credentials (Phase 4)

The frontend currently contains hardcoded Supabase credentials in `src/lib/apiConfig.js`. This is documented and will be addressed in Phase 4 (Backend Hygiene & Security) by:
- Moving credentials to environment variables
- Creating `.env.example` template
- Updating build/deploy pipeline

### Frontend Decomposition (WP4) - Complete

Large components status:
- `src/registration/App.jsx` (~3,491 lines) - Screens extracted prior to WP4; 8 admin handlers extracted in WP4 Phase 3
- `src/admin/App.jsx` (~792 lines) - Tab sections + handlers extracted in WP4 Phase 2
- `src/courtboard/main.jsx` (~105 lines) - Fully decomposed in WP4 Phase 1
- `CompleteBlockManagerEnhanced.jsx` (~832 lines) - Decomposed in Phase 2.2

Note: registration/App.jsx remains large due to 73 useState declarations and tightly coupled state orchestration. Further reduction requires WP5+ architectural refactoring.

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
