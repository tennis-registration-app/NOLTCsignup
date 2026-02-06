# Window Globals Policy

---

## Overview

This document defines the policy for window global access in the NOLTC Tennis
Registration System. All window property reads and writes must go through
centralized platform modules.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Application Code                             │
│   (Registration, Courtboard, Admin)                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│  src/platform/          │           │  src/platform/          │
│  windowBridge.js        │           │  registerGlobals.js     │
│  (READS)                │           │  (WRITES)               │
│                         │           │                         │
│  getAppUtils()          │           │  setTennisGlobal()      │
│  getTennisConfig()      │           │  ensureTennisGlobal()   │
│  isMobileView()         │           │  setGeolocationService- │
│  getRefreshBoard()      │           │    Global()             │
│  getRefreshAdminView()  │           │  setNoltcUseApiGlobal() │
│  getLoadData()          │           │  setLoadDataGlobal()    │
│  getTennis()            │           │  setRefreshBoardGlobal()│
│  ...                    │           │  setRefreshAdminView-   │
│                         │           │    Global()             │
│                         │           │  setScheduleAdmin-      │
│                         │           │    RefreshGlobal()      │
│                         │           │  ...                    │
└─────────────────────────┘           └─────────────────────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  window.*       │
                    │  (browser)      │
                    └─────────────────┘
```

---

## Rules

### 1. Reads: Use windowBridge.js

All window global reads must use getters from `src/platform/windowBridge.js`:

```javascript
// ✅ CORRECT
import { getTennisConfig, isMobileView } from '../platform/windowBridge.js';

const config = getTennisConfig();
if (isMobileView()) { /* ... */ }

// ❌ INCORRECT
const config = window.APP_UTILS?.TENNIS_CONFIG;
if (window.IS_MOBILE_VIEW) { /* ... */ }
```

### 2. Writes: Use registerGlobals.js

All window global writes must use setters from `src/platform/registerGlobals.js`:

```javascript
// ✅ CORRECT
import { setRefreshBoardGlobal, ensureTennisGlobal } from '../platform/registerGlobals.js';

ensureTennisGlobal();
setRefreshBoardGlobal(myRefreshFunction);

// ❌ INCORRECT
window.Tennis = window.Tennis || {};
window.refreshBoard = myRefreshFunction;
```

### 3. Exports via platform/index.js

Both modules are re-exported from `src/platform/index.js` for convenience:

```javascript
import {
  getTennisConfig,      // read
  setRefreshBoardGlobal // write
} from '../platform';
```

---

## Exceptions

### IIFE Files (Plain JS)

These files use plain JavaScript IIFEs and cannot import ES modules. They are
documented exceptions and may access window globals directly:

| File | Purpose |
|------|---------|
| `src/lib/browser-bridge.js` | IIFE namespace setup (APP_UTILS, Tennis) |
| `src/courtboard/browser-bridge.js` | CourtAvailability export for fallback bar |
| `src/courtboard/mobile-bridge.js` | Cross-frame mobile communication |
| `src/courtboard/mobile-fallback-bar.js` | Mobile join button sync |
| `src/courtboard/sync-promotions.js` | Promotion sync (reads only) |
| `src/courtboard/debug-panel.js` | Debug panel (reads only) |
| `src/registration/nav-diagnostics.js` | Navigation diagnostics (reads only) |

### Platform Layer (Authorized Writers)

These files are the single authorized writers and may write to window directly:

| File | Purpose |
|------|---------|
| `src/platform/windowBridge.js` | `ensureTennisNamespace()` |
| `src/platform/registerGlobals.js` | All setter functions |
| `src/courtboard/bridge/window-bridge.js` | `writeCourtboardState()` |
| `src/courtboard/courtboardState.js` | Getter exports for cross-frame |

---

## Verification

Run this command to audit window writes:

```bash
rg -n "\\bwindow\\.\\w+\\s*=" src/ --glob '*.js' --glob '*.jsx'
```

Expected matches should be limited to:
- `src/platform/registerGlobals.js` (setters)
- `src/platform/windowBridge.js` (ensureTennisNamespace)
- `src/courtboard/bridge/window-bridge.js` (writeCourtboardState)
- `src/courtboard/courtboardState.js` (getter exports)
- IIFE exceptions listed above

Any other matches indicate policy violations.

---

## Rationale

1. **Testability**: Centralized access makes mocking straightforward
2. **Auditability**: Single grep finds all global access points
3. **Safety**: Prevents accidental overwrites from scattered code
4. **Documentation**: Clear inventory of what's exposed globally
5. **Migration path**: Easy to remove globals as IIFE files are modernized

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment configuration
