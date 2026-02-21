# Admin Architecture Notes

## Why Admin Differs from Registration

Registration went through two full architectural passes: presenter extraction,
handler scoping, ESM migration, and comprehensive test coverage. The admin app
predates that work but has since been brought closer to parity.

## Current State

- `App.jsx` (~483 lines): Composition root with tab routing and provider
  nesting. `buildAdminController` wired in. 14 inline `useMemo` domain-object
  factories replaced by single controller call. All 8 `useCallback` hooks
  extracted to `useAdminHandlers.js`. Zero `useCallback` calls remain in App.jsx.
- `buildAdminController.js` (282 lines): Pure function producing 6 domain
  sections (wetCourts, blocks, status, calendar, ai, services). 30 contract
  tests passing.
- `useAdminHandlers.js` (100 lines): 8 extracted callbacks (clearCourt,
  moveCourt, clearAllCourts, removeFromWaitlist, moveInWaitlist, applyBlocks,
  refreshData, handleEditBlockFromStatus). Contract test validates surface.
- **Presenter layer**: 4 presenters extracted with equivalence tests:
  - `calendarPresenter.js` — calendar section props
  - `statusPresenter.js` — court status section props
  - `blockingPresenter.js` — block management section props
  - `waitlistPresenter.js` — waitlist section props
  - 3 thin sections (Analytics, History, System) assessed — too thin for
    presenter pattern, left as direct prop pass-through.

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
- **useCallbacks** — all 8 extracted to `useAdminHandlers.js` with contract test
- **Presenters** — 4 presenter files added with equivalence tests

## Convergence Status

1. ~~Wire `buildAdminController` into `App.jsx`~~ Done
2. ~~Extract useCallbacks to handlers file~~ Done (useAdminHandlers.js)
3. ~~Extract admin presenters for major sections~~ Done (4 presenters)

The admin app works correctly and has test coverage.
Registration's architecture is the target pattern.

## Remaining Items

- `App.jsx` at ~483 lines — composition root with tab routing + provider
  nesting. Further reduction limited by React hook rules.
- `domainObjects.js` at 514 lines — intermediate factory, tested via
  controller contract. Candidate for incremental decomposition.
- Courtboard IIFE/ESM coexistence — retained debt, documented in
  review-remediation.md.
- Authentication — deferred, documented in review-remediation.md.

## Two Generations of Architecture

The codebase contains two generations of architecture. Registration reflects
deliberate, pattern-driven design with full presenter coverage. Admin reflects
earlier exploratory work that has been incrementally converged toward the
registration pattern.

## Deferred Items

- **Inline `style={{}}`** — 10 instances across 6 block manager components.
  Mostly layout/order styles. Convert to Tailwind when touching these files.
- **DEBUG/dbg bindings** — local declarations in some hooks appear unused but
  are wired through the dependency chain to 9 active call sites in
  useMobileFlowController and courtHandlers. Not dead code.
