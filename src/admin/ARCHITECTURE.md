# Admin Architecture Notes

## Why Admin Differs from Registration

Registration went through two full architectural passes: presenter extraction,
handler scoping, ESM migration, and comprehensive test coverage. The admin app
predates that work.

## Current State

- `App.jsx` (~512 lines): `buildAdminController` wired in. 14 inline `useMemo`
  domain-object factories replaced by single controller call. 7 `useCallback` hooks
  remain (capture React state: clearCourt, moveCourt, clearAllCourts, etc.).
- `buildAdminController.js` (235 lines): Pure function producing 6 domain sections
  (wetCourts, blocks, status, calendar, ai, services). 30 contract tests passing.
- No presenter layer yet

## Recent Cleanup (Convergence Plan, Feb 2026)

The following changes were made as part of the system-wide convergence plan:

- **getDeviceId()** — extracted from 3 duplicate inline functions to
  `src/admin/utils/getDeviceId.js`
- **USE_REAL_AI** — replaced hardcoded `true` flag with `featureFlags.USE_REAL_AI`
  from `runtimeConfig.js` (env-driven)
- **AdminPanelV2 guard** — removed dead `typeof` check (always true)
- **beforeunload** — moved from module-level to `useEffect` with cleanup
- **TabNavigation** — converted 5 `React.createElement()` calls to JSX
- **Block durations** — named magic numbers (`DURATION_2H`, `DURATION_4H`)
- **Stale comment** — removed `{/* ADD THIS LINE */}`

## Convergence Path

1. ~~Wire `buildAdminController` into `App.jsx`~~ Done (Feb 2026)
2. Extract admin presenters for each panel/section
3. Slim `App.jsx` further — remaining 7 useCallbacks could move to a handlers file

The admin app works correctly and has test coverage.
Registration's architecture is the target pattern.

## Two Generations of Architecture

The codebase contains two generations of architecture. Registration reflects
deliberate, pattern-driven design with full presenter coverage. Admin reflects
earlier exploratory work. The task is convergence, not reinvention.

## Deferred Items

- **Inline `style={{}}`** — 10 instances across 6 block manager components.
  Mostly layout/order styles. Convert to Tailwind when touching these files.
- **DEBUG/dbg bindings** — local declarations in some hooks appear unused but
  are wired through the dependency chain to 9 active call sites in
  useMobileFlowController and courtHandlers. Not dead code.
