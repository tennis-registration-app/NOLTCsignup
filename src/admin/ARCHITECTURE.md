# Admin Architecture Notes

## Why Admin Differs from Registration

Registration went through two full architectural passes: presenter extraction,
handler scoping, ESM migration, and comprehensive test coverage. The admin app
predates that work.

## Current State

- `App.jsx` (~600 lines): 24 inline `useMemo`/`useCallback` blocks. Tier 3
  housekeeping completed (dead guards removed, beforeunload moved to useEffect,
  USE_REAL_AI wired to runtimeConfig, stale comments removed).
- `buildAdminController.js` (234 lines): Pure function scaffolded to replace
  the inline hooks. Has 30 contract tests via `CONTROLLER_KEYS`. **Not yet wired in.**
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

## Convergence Path (When Prioritized)

1. Wire `buildAdminController` into `App.jsx` (replace 24 inline hooks with single call)
2. Extract admin presenters for each panel/section
3. Slim `App.jsx` to thin shell matching registration's pattern

This is not urgent. The admin app works correctly and has test coverage.
Registration's architecture is the target pattern. The controller is already
built — only the wiring step remains.

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
