# WP-HR6: Admin Modularization — Extraction Plan

## Final Results (WP-HR6 Complete)

| Metric | Before | After | Target |
|---|---|---|---|
| admin/App.jsx lines | 710 | 477 | ≤500 |
| Unit tests | 406 | 454 | ≥416 |
| Playwright | 15/15 | 15/15 | 15/15 |
| New hook modules | 0 | 6 | — |
| New util modules | 0 | 1 | — |
| Duplicate state | — | 0 | 0 |

### Files Created

| File | Lines | Purpose |
|---|---|---|
| src/admin/hooks/adminSettingsLogic.js | 158 | Pure settings CRUD |
| src/admin/hooks/useAdminSettings.js | 195 | Settings state + effects |
| src/admin/hooks/boardSubscriptionLogic.js | 90 | Pure board data transform |
| src/admin/hooks/useBoardSubscription.js | 88 | Subscription state + effect |
| src/admin/hooks/notificationLogic.js | 38 | Notification controller |
| src/admin/hooks/useNotification.js | 38 | Notification state |
| src/admin/utils/timerRegistry.js | 38 | Shared timer management |
| tests/unit/admin/adminSettingsLogic.test.js | 293 | Settings logic tests (18 tests) |
| tests/unit/admin/boardSubscriptionLogic.test.js | 253 | Board transform tests (22 tests) |
| tests/unit/admin/notificationLogic.test.js | 190 | Notification tests (8 tests) |

### What Stays in App.jsx

- Clock effect (#4): cosmetic 1-second tick, too small to extract
- currentTime, activeTab, blockEditing state: UI routing
- showAIAssistant state: UI toggle
- handleRefreshData: thin glue between settings + subscription hooks
- JSX orchestration: tab routing, prop passing

### Architecture After HR6

```
App.jsx (orchestrator, 477 lines)
  ├── useNotification()        → notification state + showNotification
  ├── useAdminSettings()       → settings + effects #1/#2 + handlers
  ├── useBoardSubscription()   → board state + effect #3
  ├── clock effect (#4)        → currentTime (inline)
  ├── handleRefreshData()      → thin glue (reloadSettings + bumpRefreshTrigger)
  └── JSX return               → tab routing + prop passing
```

### Commit Summary

| Commit | Hash | Description |
|---|---|---|
| 1 | cbe4f1c | docs: add HR6 extraction plan with line-level audit |
| 2 | b675bf2 | refactor(admin): extract settings logic to hook |
| 3 | a98a1e0 | refactor(admin): extract board subscription into pure module + hook |
| 4 | c3af106 | refactor(admin): extract timer registry, notification logic, and clearWaitlist handler |
| 5 | (this) | docs: finalize HR6 extraction plan with actual results |

---

## Current State

- `admin/App.jsx`: 710 lines
- 16 useState declarations (lines 154-169, plus 1 in nested App component at 647)
- 4 useEffect blocks (lines 262, 280, 337, 389)
- 3 async handlers remaining (updateBallPrice, handleAISettingsChanged, handleClearWaitlist)
- 1 non-async handler with .then (handleSettingsChanged)
- JSX block: 142 lines (AdminPanelV2 return at line 501 to line 643)
- WP4 already extracted: 9 tab components (src/admin/tabs/), 4 handler modules (src/admin/handlers/)

## Extraction Clusters

### Cluster A: Settings Loading + Refresh

**Lines:** 209-268, 434-467, 470-486
**Contains:**
- `loadData()` function (lines 209-253)
  - Backend call: `backend.admin.getSettings()`
  - State updates: `setBlockTemplates`, `setSettings`, `setOperatingHours`, `setHoursOverrides`
  - Error handling: try/catch with `showNotification('Failed to load data', 'error')`
- `loadDataRef` (lines 258-259) — stable ref for event listeners
- Effect #1: ADMIN_REFRESH listener (lines 262-268)
  - Trigger: `[]` (mount only)
  - Cleanup: `window.removeEventListener('ADMIN_REFRESH', onAdminRefresh)`
  - Error handling: none (simple delegation to loadDataRef.current())
- Effect #2: mount + storage listener (lines 280-325)
  - Trigger: `[loadData]`
  - Cleanup: `window.removeEventListener('storage', handleStorageEvent)` + beforeunload cleanup
  - Error handling: try/catch around cleanup (intentionally ignored)
- `updateBallPrice` handler (lines 434-444)
  - Backend call: `backend.admin.updateSettings({ settings: { ball_price_cents } })`
  - State updates: `setSettings((prev) => ({ ...prev, tennisBallPrice: price }))`
  - Toast success: `'Ball price updated'`, `'success'`
  - Toast error: `'Failed to update ball price'`, `'error'`
- `handleSettingsChanged` handler (lines 447-467)
  - Backend call: `backend.admin.getSettings().then(...)`
  - State updates: `setSettings`, `setOperatingHours`, `setHoursOverrides`
  - Toast: none
- `handleAISettingsChanged` handler (lines 470-486)
  - Backend call: `backend.admin.getSettings()` (async/await)
  - State updates: `setSettings`, `setHoursOverrides`
  - Toast: none

**State owned by this cluster:**
- `settings` (line 158) — used at lines 158, 233, 439, 451, 474
- `setOperatingHours` (line 159) — used at lines 159, 243, 460
- `hoursOverrides` (line 160) — used at lines 160, 246, 463, 483
- `setBlockTemplates` (line 157) — used at lines 157, 223

**Source-of-truth rule:** After extraction, the settings hook owns all
settings-related state. App.jsx destructures from hook return. No duplicate
state for settings/operatingHours/hoursOverrides/blockTemplates.

**Proposed extraction target:** Pure logic module + thin hook wrapper.
(Exact filenames to be confirmed at Commit 2 planning.)

### Cluster B: Board Subscription

**Lines:** 327-382
**Contains:**
- `generateBlocksFingerprint` helper (lines 328-334)
- Effect #3: board subscription (lines 337-382)
  - Trigger: `[]` (mount only)
  - Cleanup: `unsubscribe()` callback from `backend.queries.subscribeToBoardChanges`
  - Error handling: none (subscription callback handles board)

**State owned by this cluster:**
- `courts` (line 155) — used at lines 155, 348
- `waitingGroups` (line 156) — used at lines 156, 350
- `courtBlocks` (line 165) — used at lines 165, 365
- `refreshTrigger` (line 163) — used at lines 163, 190, 372, 491, 558

**Refs owned by this cluster:**
- `lastBlocksFingerprintRef` (line 172)

**Source-of-truth rule:** After extraction, the subscription hook owns all
board-related state. App.jsx destructures from hook return.

**Tests verify:** State derivation given callback inputs (pure function).
Not realtime transport, not Supabase, not timing. Unsubscribe semantics
preserved exactly.

**Proposed extraction target:** Pure transform functions + thin hook wrapper.
(Exact filenames to be confirmed at Commit 3 planning.)

### Cluster C: Notification

**Lines:** 161, 270-277
**Contains:**
- `notification` useState (line 161)
- `showNotification` function (lines 271-277)
  - Sets: `setNotification({ message, type })`
  - Auto-dismiss: `setTimeout(() => setNotification(null), 3000)` via `addTimer()`

**Timer isolation rule:** Notification's setTimeout registration uses
addTimer() from the central timer registry (lines 103-119). Effect #4 (clock tick)
also uses addTimer(). These two timer usages share the registry but are
otherwise independent and must NOT be coupled in extraction.

**Proposed extraction target:** Pure logic module + thin hook wrapper.
(Exact filenames to be confirmed at Commit 4 planning.)

### Cluster D: handleClearWaitlist

**Lines:** 495-498
**Contains:**
- `handleClearWaitlist` handler (lines 495-498)
  - Backend call: `backend.commands.clearWaitlist()`
  - State updates: none (returns result)
  - Toast: none

**Proposed target:** Move to existing `src/admin/handlers/waitlistOperations.js`
(extends WP4 pattern).

### Cluster E: handleRefreshData

**Lines:** 489-492
**Contains:**
- `handleRefreshData` callback (lines 489-492)
  - Calls: `loadData()`, `setRefreshTrigger((prev) => prev + 1)`
  - Used by: MockAIAdmin component

**Coupling note:** Depends on loadData from Cluster A and refreshTrigger from Cluster B.
Must remain in App.jsx or be wired via props after other clusters extract.

### Stays in App.jsx

- Effect #4: clock interval (lines 389-403) — 15 lines, cosmetic, too small to extract
- `currentTime` useState (line 162)
- `activeTab` + UI routing state (line 154)
- `blockingView` state (line 164)
- `blockToEdit` state (line 166)
- `calendarView` state (line 167)
- `selectedDate` state (line 169)
- `showAIAssistant` state (line 168)
- Court operation wrappers (lines 406-412) — already delegate to handlers
- Block operation wrapper (lines 423-424) — already delegates to handler
- Waitlist operation wrappers (lines 427-431) — already delegate to handlers
- `existingBlocks` computation (lines 415-420)
- Hook call sites + JSX orchestration (lines 501-643)

## State Migration Map

| State Variable | Line | After HR6 | Commit |
|---|---|---|---|
| activeTab | 154 | App.jsx | — |
| courts | 155 | useBoardSubscription | 3 |
| waitingGroups | 156 | useBoardSubscription | 3 |
| blockTemplates | 157 | useAdminSettings | 2 |
| settings | 158 | useAdminSettings | 2 |
| operatingHours | 159 | useAdminSettings | 2 |
| hoursOverrides | 160 | useAdminSettings | 2 |
| notification | 161 | useNotification | 4 |
| currentTime | 162 | App.jsx | — |
| refreshTrigger | 163 | useBoardSubscription | 3 |
| blockingView | 164 | App.jsx | — |
| courtBlocks | 165 | useBoardSubscription | 3 |
| blockToEdit | 166 | App.jsx | — |
| calendarView | 167 | App.jsx | — |
| showAIAssistant | 168 | App.jsx | — |
| selectedDate | 169 | App.jsx | — |

## Effect Ordering Preservation

Effects run in the order their containing hooks are called during render.
By placing the settings hook call before the subscription hook call in
App.jsx's function body, we preserve the original ordering:
effects #1/#2 (settings) run before effect #3 (subscription).

The orchestrator component MUST call hooks in this order:
1. Settings hook (or equivalent) — contains effects #1, #2
2. Board subscription hook (or equivalent) — contains effect #3
3. (Effect #4 remains inline)

## Cross-Boundary Rules

- `createBackend` import from `registration/backend/index.js`: ALLOWED (shared infrastructure)
- `backend` import from `registration/backend`: ALLOWED (useUsageComparisonQuery.js)
- Any other import from `registration/`: PROHIBITED
- Current status: CLEAN — only backend imports found

## Toast/Message Parity Checklist

| Handler | Message String | Severity | Type |
|---|---|---|---|
| updateBallPrice (success) | `'Ball price updated'` | success | toast |
| updateBallPrice (error) | `'Failed to update ball price'` | error | toast |
| loadData (error) | `'Failed to load data'` | error | toast |

These strings and severities MUST be preserved exactly in extraction.

## Timer Registry (Module-Level)

The timer registry (lines 103-119) is **module-level**, not component-level:
```javascript
const _timers = [];
const addTimer = (id, type = 'interval') => { ... };
const clearAllTimers = () => { ... };
```

Used by:
- `showNotification` (timeout for auto-dismiss)
- Effect #4 (interval for clock)
- Effect #2 (clearAllTimers in beforeunload)

The registry must remain module-level or be refactored to a shared utility
if hooks need to register timers independently.

## Existing WP4 Modules (Context)

**Handler modules (src/admin/handlers/):**
- applyBlocksOperation.js: 95 lines
- courtOperations.js: 141 lines
- waitlistOperations.js: 55 lines
- wetCourtOperations.js: 64 lines
- Total: 355 lines

**Tab components (src/admin/tabs/):**
- AIAssistantSection.jsx: 73 lines
- AnalyticsSection.jsx: 12 lines
- BlockingSection.jsx: 117 lines
- CalendarSection.jsx: 34 lines
- HistorySection.jsx: 5 lines
- StatusSection.jsx: 109 lines
- SystemSection.jsx: 6 lines
- TabNavigation.jsx: 178 lines
- WaitlistSection.jsx: 59 lines
- Total: 593 lines

## Commit Plan Summary

| Commit | Cluster | New Files | Lines Moved | Tests |
|---|---|---|---|---|
| 1 | — | docs/HR6_EXTRACTION_PLAN.md | 0 | — |
| 2 | A (Settings) | hooks/useAdminSettings.js | ~80 | TBD |
| 3 | B (Subscription) | hooks/useBoardSubscription.js | ~60 | TBD |
| 4 | C (Notification) | hooks/useNotification.js | ~15 | TBD |
| 5 | D (Waitlist) | handlers/waitlistOperations.js (extend) | ~5 | TBD |

Target: App.jsx from 710 → ~550 lines (160 line reduction)
