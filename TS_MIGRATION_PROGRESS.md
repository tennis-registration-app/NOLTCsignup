# TypeScript Migration Progress

## Status: In Progress (Phase 8 complete, Phase 9 next)

---

## Phase 1: Shared Types — COMPLETE
- [x] Created `src/types/index.ts` with shared interfaces:
  - `Court` (raw API snake_case shape)
  - `Block` (raw API snake_case shape)
  - `Session` (raw API snake_case shape)
  - `Member` (raw API snake_case shape)
  - `Account` (billing/family unit)
  - `Recurrence` (pattern, frequency, endType, occurrences, endDate, daysOfWeek)
  - `BoardCourt` (normalized court from get-board)
  - `ApiResponse<T>` (ok, code, message, data, board, serverNow)
- [x] Re-exports all domain types from `appTypes.ts` (which already existed with 1206 lines)
- [x] Based on JSDoc annotations and actual data shapes in normalize/*.js
- [x] Run `npm run verify` — PASS

---

## Phase 2: Utility Layer — `src/lib/` — COMPLETE
- [x] Renamed all 60 `src/lib/**/*.js` files to `.ts` via `git mv`
- [x] Added TypeScript class property declarations (ApiAdapter, AdminCommands, TennisCourtDataStore, StorageAdapter, TennisCommands, TennisDirectory, TennisBackend, TennisQueries)
- [x] Fixed `const errors: string[] = []` in all 10 command files (was inferred `never[]`)
- [x] Typed all `options = {}` parameters with explicit interfaces
- [x] Fixed `Record<string, unknown>` property accesses with targeted casts
- [x] Added `ApiConfigShape` interface and typed Proxy in `apiConfig.ts`
- [x] Fixed `wire.ts` payload types with `Record<string, unknown>`
- [x] Fixed `normalizeCourt.ts` and `normalizeMember.ts` null variable declarations
- [x] Fixed all logger call type errors (data: unknown)
- [x] Fixed `TennisBackendShape` / `TennisBusinessLogicShape` compatibility in `appTypes.ts`
- [x] Fixed `AdminCommands` API response typing with `ApiResponse` type
- [x] Fixed `useBallPurchase.js` `existingPurchases` JSDoc cast
- [x] Reduced TS errors from 478 → 0
- [x] Run `npm run verify` — PASS (lint ✅, type-check ✅, coverage ✅, fixtures ✅, build ✅, e2e ✅)

---

## Phase 3: Registration Module — `src/registration/` — COMPLETE
- [x] Renamed all 90 `.js`/`.jsx` files to `.ts`/`.tsx` via `git mv`
  - Root: `App.jsx → App.tsx`, `main.jsx → main.tsx`
  - appHandlers/, appHandlers/effects/, appHandlers/handlers/, appHandlers/state/
  - blocks/, bootstrap/, components/, context/, court/, group/, handlers/, hooks/
  - memberIdentity/, modals/, router/, router/routes/, screens/, screens/admin/
  - screens/group/, screens/success/, search/, services/, streak/, ui/, utils/, waitlist/
- [x] Special case: `screens/components/BlockModal.tsx` (in .git/info/exclude — created fresh)
- [x] Fixed 38 TypeScript errors → 0
- [x] Fixed 48 ESLint errors → 0 (added `**/*.tsx` ESLint config block)
- [x] Updated `src/registration/index.html` entry point references
- [x] Run `npm run verify` — PASS (lint ✅, type-check ✅, coverage ✅, fixtures ✅, build ✅, e2e ✅)

## Phase 4: Admin Shared — `src/admin/` root + handlers — COMPLETE
- [x] Renamed src/admin/App.jsx → .tsx, main.jsx → .tsx
- [x] Renamed src/admin/handlers/ 4 files: courtOperations, waitlistOperations, applyBlocksOperation, wetCourtOperations → .ts
- [x] Cascade conversions: useAdminHandlers, useAdminAppState, useWetCourts → .ts; NotificationContext, ConfirmContext → .tsx
- [x] Added typed interfaces: CourtOpCtx, WaitlistOpCtx, ApplyBlocksCtx, WetCourtOpCtx, UseAdminHandlersDeps
- [x] Preserved board-check pattern (if result.board → applyBoardResponse else refreshBoard) via WithBoard casts
- [x] Fixed validate-fixtures.js (pre-existing break): added esbuild bundling with path.resolve() for .ts entry points
- [x] Fixed context import paths: removed .tsx extension from all importers (TS5097)
- [x] Updated src/admin/index.html: main.jsx → main.tsx
- [x] Run `npm run verify` — PASS (lint ✅, type-check ✅, coverage ✅, fixtures ✅, build ✅, e2e ✅)
- [x] Unit tests: 161 files, 3134 tests all pass

## Phase 5: Admin Blocks — `src/admin/blocks/` — COMPLETE
- [x] Renamed all 24 .js/.jsx files to .ts/.tsx (16 components, 3 hooks, 2 utils, 1 index, 2 sub-components)
- [x] Force-added 4 files from .git/info/exclude: useBlockFormState, blockValidation, BlockForm, ConflictDetector
- [x] Added TypeScript interfaces: TimelineBlock, BlockTimelineCardProps, BlockFormState, AdminBackend, ConflictDetectorProps
- [x] Fixed never[] inference for blocks/conflicts/appliedBlocks arrays
- [x] Fixed form destructuring: typed form as BlockFormState with all setters
- [x] Fixed backend.admin typing with explicit cancelBlock/cancelBlockGroup signatures
- [x] Fixed populateFromBlock block parameter with specific optional field types
- [x] Converted BlockTimelineCard from @type JSDoc to React.FC<BlockTimelineCardProps>
- [x] Exported TimelineBlock from BlockTimelineCard for reuse in BlockTimeline
- [x] Removed .jsx/.js extensions from all internal imports
- [x] Updated test: wetCourtsDedup.test.js .jsx to .tsx path reference
- [x] Run npm run verify — PASS (lint, type-check, coverage, fixtures, e2e all pass)
- [x] Unit tests: 161 files, 3134 tests all pass
## Phase 6: Admin Calendar — `src/admin/calendar/` — COMPLETE
- [x] Renamed all 8 .js/.jsx files to .ts/.tsx via `git mv`:
  - utils.js, index.js, CalendarToolbar.jsx, InteractiveEvent.jsx
  - EventDetailsModal.jsx, DayViewEnhanced.jsx, WeekView.jsx, EventCalendarEnhanced.jsx
- [x] Added CalendarEvent and LayoutInfo interfaces to utils.ts (exported for reuse)
- [x] Added HoursOverride and DayViewEnhancedProps interfaces to DayViewEnhanced.tsx (exported HoursOverride)
- [x] Added WeekViewProps, CalendarToolbarProps, InteractiveEventProps, EventDetailsModalProps interfaces
- [x] Added EventCalendarEnhancedProps and CalendarAdminBackend interfaces to EventCalendarEnhanced.tsx
- [x] Typed all React.FC components with proper generic props
- [x] Typed useState, useRef hooks with proper generics
- [x] Fixed hoursOverrides default as [] as HoursOverride[] to prevent never[] inference
- [x] Fixed layoutInfo fallback object to include group: [] as CalendarEvent[] for union type safety
- [x] Fixed .jsx/.js import extensions in 3 external files (useBlockActions.ts, eventCalendarPresenter.js, CourtStatusGrid.jsx)
- [x] Run npm run verify — PASS (lint, type-check, coverage, fixtures, build, e2e all pass)

## Phase 7: Admin Remaining — analytics, system, guards, etc. — COMPLETE
- [x] Renamed all remaining src/admin/ .js/.jsx files to .ts/.tsx
- [x] Run `npm run verify` — PASS

## Phase 8: Remaining src/ Files — COMPLETE
- [x] Renamed all remaining src/ .js/.jsx files to .ts/.tsx via git mv
  - src/components/icons/TypedIcon.tsx
  - src/config/ (index.ts, runtimeConfig.ts)
  - src/courtboard/ (bootstrap, bridge, components, hooks, mobile, utils)
  - src/mobile-shell/ (main.ts, mobileBridge.ts, healthCheck.ts)
  - src/platform/ (13 files: attachLegacy*, index.ts, prefsStorage.ts, etc.)
  - src/registration/screens/components/BlockModal.tsx
  - src/shared/ (bootstrap, components, constants, courts, ui, utils)
  - src/tennis/domain/ (availability.ts, roster.ts, waitlist.ts)
  - src/test-react/main.tsx
- [x] Fixed cascading TypeScript errors from type narrowing in bridge/domain files
- [x] Updated HTML entry points (courtboard, admin, registration, Mobile.html, test-react)
- [x] Added file-level eslint-disable to bridge/bootstrap files (intentional window.Tennis usage)
- [x] Run `npm run verify` — PASS (lint, type-check, coverage, fixtures, build, e2e all pass)

## Phase 9: Test Files — PENDING
- [ ] Convert tests/ from .js/.jsx to .ts/.tsx
- [ ] Run `npm run verify`

## Phase 10: Cleanup and Verification — PENDING
- [ ] Search for remaining .js/.jsx in src/
- [ ] Search for remaining .js/.jsx in tests/
- [ ] Verify zero avoidable `any` types
- [ ] Run `npm run verify` final time
