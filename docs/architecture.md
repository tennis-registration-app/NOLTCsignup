# Architecture

## Module System
All domain logic lives in ES modules under `src/`.
Legacy `window.Tennis.*` globals are populated by
adapter modules in `src/platform/attachLegacy*.js`,
imported at the top of each entry point.

## Entry Points
| Entry | HTML | Main Module |
|-------|------|-------------|
| Registration | src/registration/index.html | src/registration/main.jsx |
| Courtboard | src/courtboard/index.html | src/courtboard/main.jsx |
| Admin | src/admin/index.html | src/admin/main.jsx |
| Mobile Shell | Mobile.html | src/mobile-shell/main.js |

## Mobile Shell
Mobile.html is an ESM entry that coordinates
Registration and Courtboard iframes. It loads
`src/mobile-shell/main.js` which imports only
the Events adapter. Shell logic:
- `mobileBridge.js` — iframe coordination,
  state sync via sessionStorage, postMessage
- `healthCheck.js` — iframe health monitoring,
  debug-only selfTest (?debug=1)

## Adapter Pattern
Each `attachLegacy*.js` module:
1. Imports canonical ESM implementation
2. Attaches to `window.Tennis.*` for legacy compat
3. Self-registers on import (no explicit init call)

Adapters (in import order):
1. `attachLegacyConfig.js` → `window.Tennis.Config`
2. `attachLegacyTime.js` → `window.Tennis.Domain.Time`
3. `attachLegacyStorage.js` → `window.Tennis.Storage`
4. `attachLegacyEvents.js` → `window.Tennis.Events`
5. `attachLegacyDataStore.js` → `window.Tennis.DataStore`
6. `attachLegacyBlocks.js` → `window.Tennis.Domain.Blocks`
7. `attachLegacyAvailability.js` → `window.Tennis.Domain.Availability`
8. `attachLegacyRoster.js` → `window.Tennis.Domain.Roster`
9. `attachLegacyWaitlist.js` → `window.Tennis.Domain.Waitlist`

## Source Locations

| ESM Module | Legacy Global |
|------------|---------------|
| `src/tennis/config.js` | `Tennis.Config` |
| `src/tennis/domain/time.js` | `Tennis.Domain.Time` |
| `src/lib/storage.js` | `Tennis.Storage` |
| `src/tennis/events.js` | `Tennis.Events` |
| `src/tennis/datastore.js` | `Tennis.DataStore` |
| `src/tennis/domain/blocks.js` | `Tennis.Domain.Blocks` |
| `src/tennis/domain/availability.js` | `Tennis.Domain.Availability` |
| `src/tennis/domain/roster.js` | `Tennis.Domain.Roster` |
| `src/tennis/domain/waitlist.js` | `Tennis.Domain.Waitlist` |

## Court Availability Logic
Court availability is computed by `src/tennis/domain/availability.js`:
- `getFreeCourtsInfo()` — Excludes tournament courts from "free" count
- `getCourtStatuses()` — Overrides display for blocked/tournament courts
- `src/shared/courts/overtimeEligibility.js` — Excludes from fallback courts
