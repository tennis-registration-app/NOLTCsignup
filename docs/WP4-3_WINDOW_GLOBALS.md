# WP4-3: Window Globals Inventory

**Date:** 2026-02-02
**Baseline:** 466 unit tests, 15 E2E tests, npm run verify green

---

## Table A: Window Writes (`window.X = ...`)

All locations in `src/` where a value is assigned to a window property.

| ID | File | Line | Symbol | Purpose | Owner | Target |
|----|------|------|--------|---------|-------|--------|
| W1 | src/lib/browser-bridge.js | 25 | `window.APP_UTILS` | Namespace for IIFE files (TENNIS_CONFIG, formatters) | scattered | IIFE-exception |
| W2 | src/lib/browser-bridge.js | 31 | `window.Tennis` | Tennis namespace initialization | scattered | IIFE-exception |
| W3 | src/courtboard/courtboardState.js | 89 | `window.getCourtboardState` | Export getter for cross-frame access | scattered | keep |
| W4 | src/courtboard/courtboardState.js | 90 | `window.isCourtboardStateReady` | Export readiness check for cross-frame | scattered | keep |
| W5 | src/courtboard/mobile-bridge.js | 15 | `window.mobileTapToRegister` | Mobile court tap handler | IIFE | IIFE-exception |
| W6 | src/courtboard/mobile-fallback-bar.js | 177 | `window.updateJoinButtonForMobile` | Mobile join button sync | IIFE | IIFE-exception |
| W7 | src/courtboard/mobile-fallback-bar.js | 244 | `window.updateJoinButtonState` | Join button state update | IIFE | IIFE-exception |
| W8 | src/courtboard/bridge/window-bridge.js | 16 | `window.CourtboardState` | Single writer for courtboard state | platform | keep |
| W9 | src/courtboard/browser-bridge.js | 14 | `window.CourtAvailability` | Export for plain JS fallback bar | scattered | IIFE-exception |
| W10 | src/platform/windowBridge.js | 91 | `window.Tennis` | ensureTennisNamespace() - authorized init | platform | keep |
| W11 | src/registration/App.jsx | 18 | `window.Tennis` | Tennis namespace initialization | scattered | registerGlobals |
| W12 | src/registration/App.jsx | 19 | `window.GeolocationService` | GeolocationService export | scattered | registerGlobals |
| W13 | src/registration/services/index.js | 119 | `window.NOLTC_USE_API` | API mode flag (enable) | scattered | registerGlobals |
| W14 | src/registration/services/index.js | 130 | `window.NOLTC_USE_API` | API mode flag (disable) | scattered | registerGlobals |
| W15 | src/registration/appHandlers/useRegistrationAppState.js | 353 | `window.loadData` | Export data loader for legacy callers | scattered | registerGlobals |
| W16 | src/courtboard/components/TennisCourtDisplay.jsx | 341 | `window.refreshBoard` | Export board refresh for legacy callers | scattered | registerGlobals |
| W17 | src/admin/App.jsx | 208 | `window.refreshAdminView` | Export admin refresh for legacy callers | scattered | registerGlobals |
| W18 | src/admin/utils/adminRefresh.js | 13 | `window.__adminRefreshPending` | Internal state for debounce | scattered | registerGlobals |
| W19 | src/admin/utils/adminRefresh.js | 14 | `window.__adminCoalesceHits` | Dev metric for coalesce tracking | scattered | registerGlobals |
| W20 | src/admin/utils/adminRefresh.js | 16 | `window.scheduleAdminRefresh` | Export refresh scheduler | scattered | registerGlobals |
| W21 | src/admin/utils/adminRefresh.js | 41 | `window.__wiredAdminListeners` | Guard against double-wiring | scattered | registerGlobals |

### Write Classifications

- **registerGlobals**: Will be moved to centralized registration module in Commit 2
- **keep**: Already in platform layer (`windowBridge.js`, `window-bridge.js`), stays there
- **IIFE-exception**: In plain JS files that can't use ES imports — documented, not moved

### Summary

- Total write locations: **21**
- To migrate to registerGlobals: **11** (W11-W21)
- Already in platform layer: **4** (W3, W4, W8, W10)
- IIFE exceptions: **6** (W1, W2, W5, W6, W7, W9)

---

## Table B: Window Reads (Reference Only — NOT Moving)

Reads are NOT being relocated in WP4-3. This table is for reference only.

| File | Approx Read Count | Via windowBridge? | Notes |
|------|--------------------|-------------------|-------|
| src/platform/windowBridge.js | 25+ | N/A (is the bridge) | Centralizes all reads |
| src/lib/browser-bridge.js | 10 | No | IIFE setup, reads Tennis/APP_UTILS |
| src/lib/apiConfig.js | 5 | No | URL/mobile detection |
| src/lib/TennisCourtDataStore.js | 4 | No | Event dispatch/listen |
| src/courtboard/mobile-fallback-bar.js | 30+ | No | IIFE, heavy window usage |
| src/courtboard/mobile-bridge.js | 20+ | No | IIFE, cross-frame messaging |
| src/courtboard/sync-promotions.js | 10 | No | IIFE, reads Tennis/APP_UTILS |
| src/courtboard/debug-panel.js | 5 | No | IIFE, reads Tennis |
| src/registration/nav-diagnostics.js | 10 | No | IIFE, event listeners |
| src/admin/utils/adminRefresh.js | 10 | Partial | Uses getRefreshAdminView |
| src/admin/hooks/useAdminSettings.js | 6 | No | Event listeners |
| src/admin/courts/CourtStatusGrid.jsx | 12 | Partial | Uses getTennisDataStore |
| src/admin/screens/AnalyticsDashboard.jsx | 8 | No | Reads TENNIS_CONFIG |
| src/admin/blocks/hooks/useWetCourts.js | 3 | No | Reads Events, Tennis |
| src/admin/ai/MockAIAdmin.jsx | 3 | No | Reads TENNIS_CONFIG, Events, BL |
| src/admin/blocks/BlockTemplateManager.jsx | 1 | No | Reads APP_UTILS |
| src/admin/App.jsx | 2 | Partial | Uses getAppUtils, getTennis |
| src/registration/utils/helpers.js | 4 | No | Reads Tennis.Domain, Tennis.Storage |
| src/registration/services/index.js | 3 | No | Reads NOLTC_USE_API, location |
| src/registration/appHandlers/*.js | 5 | Partial | Mix of bridge and direct |
| src/registration/screens/*.jsx | 8 | Partial | postMessage, UI access |
| src/courtboard/components/*.jsx | 15 | Partial | Mix of bridge and direct |

---

## Platform Layer Current State

### windowBridge.js (276 lines)

- **Purpose:** Single module that owns all window.* global reads. Application code imports from here instead of accessing window directly.
- **Key exports:**
  - `getAppUtils()`, `getTennisConfig()`, `getAppEvents()`
  - `isMobileView()`, `isApiMode()`, `getGeolocationService()`
  - `ensureTennisNamespace()`, `getTennis()`, `getTennisDomain()`
  - `getTennisCommands()`, `getTennisDataStore()`, `getTennisStorage()`, `getTennisUI()`, `getTennisEvents()`
  - `getDataStoreValue()`, `setDataStoreValue()`, `getStorageDataSafe()`
  - `getMobileModal()`, `getUI()`, `getRefreshBoard()`, `getRefreshAdminView()`, `getLoadData()`, `getMobileTapToRegister()`
- **Window writes in this file:** 1 (line 91: `window.Tennis = window.Tennis || {}` inside `ensureTennisNamespace()`)
- **Window reads in this file:** 25+ (getters for all global namespaces)

### platform/index.js (26 lines)

- **Purpose:** Re-exports from windowBridge.js for cleaner imports
- **Exports:** All getters from windowBridge.js (no additional logic)

### courtboard/bridge/window-bridge.js (16 lines)

- **Purpose:** Single writer for window.CourtboardState (WP4.1 pattern)
- **Exports:** `writeCourtboardState(nextState)`
- **Window writes:** 1 (line 16: `window.CourtboardState = nextState`)

---

## IIFE Exceptions (Cannot Use ES Imports)

These files use plain JS IIFEs and cannot import ES modules. Their window usage is documented but NOT migrated.

| File | Window Writes | Window Reads | Reason for Exception |
|------|--------------|-------------|---------------------|
| src/courtboard/sync-promotions.js | 0 | 10 (Tennis, APP_UTILS, CourtboardState, dispatchEvent) | Plain JS IIFE, no ES imports |
| src/courtboard/mobile-bridge.js | 1 (mobileTapToRegister) | 20+ (Tennis, parent, CourtboardState) | Plain JS IIFE, no ES imports |
| src/courtboard/debug-panel.js | 0 | 5 (Tennis, addEventListener) | Plain JS IIFE, no ES imports |
| src/courtboard/mobile-fallback-bar.js | 2 (updateJoinButtonForMobile, updateJoinButtonState) | 30+ (IS_MOBILE_VIEW, CourtboardState, MobileModal, parent) | Plain JS IIFE, no ES imports |
| src/registration/nav-diagnostics.js | 0 | 10 (addEventListener, UI) | Plain JS IIFE, no ES imports |
| src/lib/browser-bridge.js | 2 (APP_UTILS, Tennis) | 10 (Tennis, APP_UTILS) | Bridge file for IIFE consumers |
| src/courtboard/browser-bridge.js | 1 (CourtAvailability) | 0 | Bridge file for IIFE consumers |

---

## Migration Plan (Commits 1–3)

### Commit 1: Create `registerGlobals.js` with setter helpers

Create `src/platform/registerGlobals.js` with setters for each W-row marked "registerGlobals":

```javascript
// Setter functions for globals that need to be written from ES modules
export function setRefreshBoard(fn) { window.refreshBoard = fn; }
export function setRefreshAdminView(fn) { window.refreshAdminView = fn; }
export function setLoadData(fn) { window.loadData = fn; }
export function setGeolocationService(service) { window.GeolocationService = service; }
export function setApiMode(enabled) { window.NOLTC_USE_API = enabled; }
// ... etc
```

### Commit 2: Replace scattered writes with setter calls

Update files W11-W21 to import and use setters instead of direct window assignment.

### Commit 3: Document policy, update architecture docs

Add policy to ARCHITECTURE.md stating all window writes must go through registerGlobals.js.

### Verification Command (must pass after Commit 2)

```bash
rg -n "\bwindow\.\w+\s*=" src/ --glob '*.js' --glob '*.jsx'
# Expected: only matches in:
#   - src/platform/windowBridge.js (ensureTennisNamespace)
#   - src/platform/registerGlobals.js (new setters)
#   - src/courtboard/bridge/window-bridge.js (writeCourtboardState)
#   - src/courtboard/courtboardState.js (export getters)
#   - IIFE exceptions (browser-bridge.js, mobile-bridge.js, mobile-fallback-bar.js)
```

---

## Out of Scope

- Moving window reads to windowBridge (already done for most files)
- Refactoring IIFE files to ES modules (requires broader mobile strategy)
- Removing window.Tennis namespace (required for IIFE files)
- postMessage calls (cross-frame communication, not window globals)
- window.addEventListener/removeEventListener (standard DOM API)
- window.location/parent/top access (standard browser APIs)
- window.confirm (standard browser API)
- window.dispatchEvent (standard DOM API)
