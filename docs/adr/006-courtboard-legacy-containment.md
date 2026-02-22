# ADR-006: Courtboard Legacy Containment Strategy

## Status
Accepted (Phase 1 landed)

## Context
The courtboard app has 29 files. 20 are modern ESM React (components, hooks, utilities). 5 are legacy IIFE/plain scripts (995 lines total) that communicate via window globals. The 9 `attachLegacy*.js` files populate `window.Tennis.*` namespaces that both the IIFE scripts and 2 ESM components read.

The boot chain in `index.html` loads scripts in a specific order. `main.jsx` polls for global readiness before mounting React. This works but is fragile — any boot-order change requires understanding all 6 scripts and their mutual dependencies.

## Decision
Contain, don't rewrite. Migrate incrementally from the edges inward:

### Phase 1: Fence globals (next)
- Document all window globals with writers and readers
- Tag each IIFE script with its deletion condition
- Add ESLint rule preventing new window.Tennis and window.IS_MOBILE_VIEW reads in courtboard ESM
- Centralize the 2 remaining ESM direct reads through windowBridge

### Phase 2: Consolidate IIFE scripts (future)
- Merge courtboardPreInit.js + mobile-bridge.js + mobile-fallback-bar.js into a single courtboard-bootstrap.js
- Single entry point sets all globals before main.jsx loads
- debug-panel.js stays separate (dev-only, gated)

### Phase 3: ESM migration (future, requires bundler strategy)
- Convert courtboard-bootstrap.js to ESM module imported by main.jsx
- Replace window.CourtboardState reads with direct imports from bridge/window-bridge.js
- Remove attachLegacy imports from main.jsx (direct ESM imports like registration/admin)
- Remove polling loop — synchronous mount

## Global Ownership Table

| Global | Writer | Readers | Deletion Condition |
|--------|--------|---------|--------------------|
| window.Tennis.UI.toast | courtboardPreInit.js | components via bridge | Phase 3: import toast utility directly |
| window.IS_MOBILE_VIEW | courtboardPreInit.js | 4 files | Phase 1: use isMobileView() from windowBridge |
| window.MobileModal | courtboardPreInit.js | 2 files | Phase 2: pass as prop or context |
| window.CourtboardState | bridge/window-bridge.js | 4 IIFE scripts | Phase 3: direct import from bridge module |
| window.mobileTapToRegister | mobile-bridge.js | self-reference | Phase 2: consolidate into bootstrap |
| window.CourtAvailability | browser-bridge.js | mobile-fallback-bar.js | Phase 2: consolidate into bootstrap |
| window.Tennis.Domain.* | 9 attachLegacy*.js | 2 ESM + 1 IIFE | Phase 3: direct ESM imports |

## Alternatives Considered
- **Full rewrite now:** High risk, no behavioral benefit. The courtboard works correctly.
- **Do nothing:** Acceptable short-term but makes onboarding harder and prevents courtboard from benefiting from the shared type system.

## Consequences
- Positive: Incremental path with exit criteria per phase. Each phase reduces global surface area.
- Positive: Phase 1 is zero-risk (ESLint rule + 2 small fixes). Phases 2-3 can be deferred indefinitely.
- Negative: Two module systems coexist until Phase 3. Boot chain remains order-dependent until Phase 2.
