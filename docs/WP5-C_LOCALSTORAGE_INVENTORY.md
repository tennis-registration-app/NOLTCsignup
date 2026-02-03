# WP5-C localStorage Inventory

Generated: 2026-02-02
Commit: C0 (inventory only)

## Summary

- Total files with localStorage: **34**
- Total occurrences: **~95** (including comments/docs)
- Domain truth (must remove): **6**
- Session cache (wrap): **8**
- UI preferences (wrap): **5**
- Wrapper/infrastructure (keep): **7**
- Comments/docs only: **8**

## Classification Rules Applied

- **DOMAIN TRUTH**: Data that exists authoritatively in backend (courts, members, assignments, waitlist, blocks). Required for correctness. Could diverge from backend.
- **SESSION CACHE**: Derived from backend, non-authoritative, safe to discard, performance-only.
- **UI PREF**: View state, filters, theme, debug settings. No backend equivalent.
- **WRAPPER**: Infrastructure modules that provide abstracted localStorage access (storage.js, TennisCourtDataStore.js).
- **DEPRECATED**: Legacy code with deprecation warnings, scheduled for removal.

## Inventory

### DOMAIN TRUTH (Must Remove) — 6 occurrences

| File | Line | Operation | Key | Classification | Remediation |
|------|------|-----------|-----|----------------|-------------|
| `src/admin/blocks/CompleteBlockManagerEnhanced.jsx` | 64 | getItem | `'courtBlocks'` | DOMAIN TRUTH | C1: remove — blocks come from backend |
| `src/admin/blocks/components/ConflictDetector.jsx` | 52 | getItem | `'courtBlocks'` | DOMAIN TRUTH | C1: remove — blocks come from backend |
| `src/courtboard/mobile/MobileModalSheet.jsx` | 97 | getItem | `'tennisMembers'` | DOMAIN TRUTH | C1: remove — members come from backend |
| `src/courtboard/mobile/MobileModalSheet.jsx` | 98 | getItem | `'members'` | DOMAIN TRUTH | C1: remove — members come from backend |
| `src/courtboard/sync-promotions.js` | 99 | getItem | `'tennisClubData'` | DOMAIN TRUTH | C1: remove — legacy compat, backend now computes |
| `src/courtboard/sync-promotions.js` | 103 | setItem | `'tennisClubData'` | DOMAIN TRUTH | C1: remove — legacy compat, backend now computes |

### SESSION CACHE (Wrap) — 8 occurrences

| File | Line | Operation | Key | Classification | Remediation |
|------|------|-----------|-----|----------------|-------------|
| `src/registration/appHandlers/handlers/guestHandlers.js` | 175 | getItem | `TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY` | SESSION CACHE | C2: wrap — guest charge queue for UI feedback |
| `src/registration/appHandlers/handlers/guestHandlers.js` | 188 | setItem | `TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY` | SESSION CACHE | C2: wrap — guest charge queue for UI feedback |
| `src/registration/screens/components/BallPurchaseFeature.jsx` | 237 | getItem | `'tennisBallPurchases'` | SESSION CACHE | C2: wrap — pending purchase display |
| `src/registration/screens/components/BallPurchaseFeature.jsx` | 240 | setItem | `'tennisBallPurchases'` | SESSION CACHE | C2: wrap — pending purchase display |
| `src/registration/screens/SuccessScreen.jsx` | 307 | getItem | `'tennisBallPurchases'` | SESSION CACHE | C2: wrap — pending purchase display |
| `src/registration/screens/SuccessScreen.jsx` | 310 | setItem | `'tennisBallPurchases'` | SESSION CACHE | C2: wrap — pending purchase display |
| `src/admin/ai/MockAIAdmin.jsx` | 232 | getItem | dynamic key | SESSION CACHE | C2: wrap — AI mock data storage |
| `src/admin/ai/MockAIAdmin.jsx` | 261 | setItem | dynamic key | SESSION CACHE | C2: wrap — AI mock data storage |

### UI PREFERENCES (Wrap) — 5 occurrences

| File | Line | Operation | Key | Classification | Remediation |
|------|------|-----------|-----|----------------|-------------|
| `src/lib/logger.js` | 67 | getItem | `'NOLTC_LOG_LEVEL'` | UI PREF | C2: wrap — debug log level |
| `src/admin/App.jsx` | 23 | getItem | `'deviceId'` | UI PREF | C2: wrap — device identification |
| `src/admin/blocks/hooks/useWetCourts.js` | 37 | getItem | `'deviceId'` | UI PREF | C2: wrap — device identification |
| `src/admin/courts/CourtStatusGrid.jsx` | 346 | getItem | `'deviceId'` | UI PREF | C2: wrap — device identification |
| `src/admin/calendar/EventDetailsModal.jsx` | 34 | getItem | `'deviceId'` | UI PREF | C2: wrap — device identification |

### SERVICE TOGGLE (Wrap) — 4 occurrences

| File | Line | Operation | Key | Classification | Remediation |
|------|------|-----------|-----|----------------|-------------|
| `src/registration/services/index.js` | 58 | getItem | `'NOLTC_USE_API'` | UI PREF | C2: wrap — API vs mock toggle |
| `src/registration/services/index.js` | 123 | setItem | `'NOLTC_USE_API'` | UI PREF | C2: wrap — API vs mock toggle |
| `src/registration/services/index.js` | 134 | removeItem | `'NOLTC_USE_API'` | UI PREF | C2: wrap — API vs mock toggle |
| `src/admin/ai/MockAIAdmin.jsx` | 350 | getItem | `'tennisBallPurchases'` | SESSION CACHE | C2: wrap — reads purchase data |

### WRAPPER/INFRASTRUCTURE (Keep As-Is) — 7 files

These modules provide the abstraction layer and should remain:

| File | Purpose | Action |
|------|---------|--------|
| `src/lib/storage.js` | Core wrapper: `readJSON()`, `writeJSON()`, `readDataSafe()` | Keep — this IS the wrapper |
| `src/lib/TennisCourtDataStore.js` | Cached data store class with localStorage backing | Keep — consolidate usages here |
| `src/lib/StorageAdapter.js` | Async interface wrapper for localStorage | Keep — legacy adapter |
| `src/lib/constants.js` | Defines `STORAGE` key constants | Keep — key definitions |
| `src/lib/court-blocks.js` | Block logic (comments only, no direct access) | Keep — uses wrapper |
| `src/lib/domain/index.js` | Comment only ("no localStorage") | N/A — documentation |
| `src/lib/domain/courtHelpers.js` | Comment only ("no localStorage") | N/A — documentation |

### COMMENTS/DOCUMENTATION ONLY — 8 files

These files mention localStorage in comments but don't access it directly:

| File | Context |
|------|---------|
| `src/courtboard/courtboardState.js` | Comment: "Don't read from localStorage" |
| `src/courtboard/mobile-bridge.js` | Comment: "NO localStorage reads" |
| `src/courtboard/mobile-fallback-bar.js` | Comment: "no localStorage fallback" |
| `src/courtboard/components/NextAvailablePanel.jsx` | Comment: "Use React state instead of localStorage" |
| `src/courtboard/components/TennisCourtDisplay.jsx` | Comment: "no localStorage fallback" |
| `src/courtboard/components/WaitingList.jsx` | Comment reference only |
| `src/registration/appHandlers/handlers/courtHandlers.js` | Deprecation warning: "localStorage persistence removed" |
| `src/registration/services/DataValidation.js` | Comment: blocks handled via courtBlocks |

## Existing Wrappers

Found in `src/lib/`:

| Module | Exports | Notes |
|--------|---------|-------|
| `src/lib/storage.js` | `readJSON`, `writeJSON`, `readDataSafe`, `getEmptyData`, `normalizeData`, etc. | Primary wrapper — uses STORAGE.DATA key |
| `src/lib/TennisCourtDataStore.js` | `TennisCourtDataStore` class | Cached store with get/set/remove methods |
| `src/lib/StorageAdapter.js` | `StorageAdapter` class | Async wrapper for API migration |
| `src/lib/logger.js` | `logger` | Self-contained log level storage |

## Key Mapping

Keys discovered in direct localStorage calls:

| Key | Used By | Backend Equivalent |
|-----|---------|-------------------|
| `'courtBlocks'` | CompleteBlockManagerEnhanced, ConflictDetector | `get-blocks` endpoint |
| `'tennisClubData'` | sync-promotions.js, storage.js (STORAGE.DATA) | `get-board` endpoint |
| `'tennisMembers'` / `'members'` | MobileModalSheet | `get-members` endpoint |
| `'tennisBallPurchases'` | BallPurchaseFeature, SuccessScreen, MockAIAdmin | `get-transactions` endpoint |
| `'deviceId'` | App.jsx, useWetCourts, CourtStatusGrid, EventDetailsModal | Runtime config |
| `'NOLTC_LOG_LEVEL'` | logger.js | N/A (dev-only) |
| `'NOLTC_USE_API'` | services/index.js | N/A (dev-only) |
| TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY | guestHandlers.js | Pending: no endpoint yet |

## Notes

1. **Good news**: Many files that previously used localStorage have been migrated to use React state via `getCourtboardState()` and API calls. Comments explicitly state "no localStorage".

2. **Pattern observed**: Device ID is read from localStorage in 4 places as fallback. Consider consolidating to a single `getDeviceId()` utility.

3. **sync-promotions.js**: Writes to `tennisClubData` for "backward compatibility with legacy UI components". The comment acknowledges backend now computes promotions.

4. **MobileModalSheet.jsx**: Falls back to localStorage for members when React state bridge not available. This is a true domain truth violation.

5. **Block conflict detection**: Both `CompleteBlockManagerEnhanced.jsx` and `ConflictDetector.jsx` read blocks from localStorage instead of using the `courtBlocks` prop that's available from React state.

6. **Ball purchases**: The `tennisBallPurchases` key is used for displaying pending purchases on the success screen. This is session cache since backend has the authoritative transaction records.

## Remediation Plan

### C1: Remove (Domain Truth) — Priority High
- Remove 6 direct localStorage reads that duplicate backend data
- Blocks, members, and promotions should come from React state/API

### C2: Wrap (Session Cache + UI Pref) — Priority Medium
- Create `src/lib/sessionStorage.js` wrapper for non-domain data
- Consolidate `deviceId` reads to single utility
- Keep debug toggles (NOLTC_LOG_LEVEL, NOLTC_USE_API) but wrap them

### Keep (Infrastructure)
- `storage.js`, `TennisCourtDataStore.js` — these ARE the wrappers
- Gradually migrate callers to use API state instead
