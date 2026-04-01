# TypeScript Test Error Reduction Progress

## Starting Baseline
- **Total errors**: 3692 (checked 2026-03-31)

---

## Iteration 1 — 2026-03-31
Pattern fixed: TS7005/TS7034 - Untyped let variables in outer describe scope
Errors before: 3692
Errors after: 3322
Reduction: 370 errors (-10%)

### Files fixed
- tests/unit/api/ApiAdapter.test.ts: let adapter -> let adapter: ApiAdapter
- tests/unit/api/TennisDirectory.test.ts: let directory -> let directory: TennisDirectory
- tests/unit/registration/group/useGroupGuest.test.ts: let ref -> let ref: { current: any }
- tests/unit/registration/appHandlers/handlers/courtHandlers.test.ts: Typed deps/mocks/result/unmount
- tests/unit/registration/appHandlers/handlers/groupHandlers.test.ts: Typed deps/mocks/result/unmount
- tests/unit/registration/appHandlers/handlers/guestHandlers.test.ts: Typed deps/mocks/result/unmount
- tests/unit/registration/appHandlers/handlers/navigationHandlers.test.ts: Typed deps/mocks/result/unmount
- tests/unit/registration/appHandlers/handlers/adminHandlers.test.ts: Typed deps/mocks/result/unmount

### Type patterns used
- Class instance types (ApiAdapter, TennisDirectory)
- ReturnType<typeof createXxxDeps>["deps"] for factory return types
- { current: any } for React hook refs (avoids null cascades from RefObject<T>)
- { current: any } for renderHandlerHook result (avoids null from harness inference)

### Notes
- adminSettingsLogic.test.ts and useRegistrationDataLayer.test.ts were attempted but reverted
  Typing mockDeps caused cascading TS2345 errors due to strict interface checking.
  Will be addressed in a later iteration using as unknown as Type cast pattern.
- ApiAdapter.test.ts: Some TS7005 errors converted to TS18046/TS2353 (pre-existing masked errors).

---

## Iteration 2 - 2026-03-31
Pattern fixed: TS7005/TS7034 - Untyped outer let variables (class instances, typed arrays, mock functions)
Errors before: 3322
Errors after: 3159
Reduction: 163 errors (-5%)

### Files fixed
- tests/unit/api/ApiAdapter.errorContract.test.ts: let adapter -> let adapter: ApiAdapter
- tests/unit/api/TennisCommands.test.ts: let commands -> let commands: TennisCommands
- tests/unit/api/TennisQueries.test.ts: let queries -> let queries: TennisQueries
- tests/unit/integration/courtSelectionAgreement.test.ts: upcomingBlocks typed array
- tests/unit/shared/overtimeEligibility.test.ts: upcomingBlocks typed array (15 occurrences)
- tests/unit/platform/attachLegacyEvents.test.ts: handler/unsubscribe typed
- tests/unit/registration/appHandlers/state/useRegistrationRuntime.test.ts: deps any, result { current: any }

### Type patterns used
- Class instance types (ApiAdapter, TennisCommands, TennisQueries)
- Record<string, unknown>[] for typed empty array literals
- ReturnType<typeof vi.fn> for mock function holders
- any for complex deps mock objects (avoids TS2345 cascade)
- { current: any } for hook result refs (consistent with iteration 1 pattern)

### Lessons Learned
- Record<string, unknown> for mockDeps cascades TS18046 (property access returns unknown)
- Zsh sandbox: [] and <> in inline bash strings trigger glob/redirect errors
- attachLegacyEvents: net positive even when some TS2345 introduced (removes 25, adds ~10)

---

## Current Baseline: 3159 errors (after iteration 2)

### Current Distribution
TS7005: 821 -> 334 (-487)
TS18046: 576 -> 576 (0)
TS2345: 559 -> 566 (+7)
TS18047: 305 -> 298 (-7)
TS2322: 279 -> 279 (0)
TS7006: 222 -> 221 (-1)
TS2571: 199 -> 199 (0)
TS2339: 165 -> 165 (0)
TS7034: 150 -> 94 (-56)
TS18048: 124 -> 125 (+1)
TS2353: 85 -> 85 (0)

Next target: Remaining TS7005/TS7034 (334+94 = 428 remaining)
Top files: useCourtActions.moveMode.test.ts (68), useSystemSettingsState (42), presenter equiv tests (~18 each)
Approach: Node scripts for array/generic typed syntax. Use any for complex mock deps.

---

## Iteration 3 — 2026-03-31
Pattern fixed: TS7005/TS7034 — All remaining untyped outer let variables (deferred promises, result refs, mock objects)
Errors before: 3159
Errors after: 2691
Reduction: 468 errors (-15%)

### Files fixed
- tests/unit/admin/courts/useCourtActions.moveMode.test.ts: resolveMove/movePromise/resolveClear/clearPromise/resolveWet/togglePromise/resolveDry/dryPromise/resolveActivate/activatePromise/resolveDeactivate/deactivatePromise (68 errors)
- tests/unit/admin/adminSettingsLogic.test.ts: mockDeps/mockBackend (48 errors)
- tests/unit/registration/appHandlers/state/useRegistrationDataLayer.test.ts: deps/result/unmount/mockUnsubscribe/getSubscriptionCallback/subscriptionCallback (49 errors)
- tests/unit/admin/screens/system/useSystemSettingsState.characterization.test.tsx: rootRef/backend/hookRef (42 errors)
- tests/unit/registration/successPresenter.equivalence.test.ts: app/handlers/legacy/presenter (21 errors)
- tests/unit/registration/homePresenter.equivalence.test.ts: app/handlers/legacy/presenter (19 errors)
- tests/unit/registration/groupPresenter.equivalence.test.ts: app/handlers/legacy/presenter (18 errors)
- tests/unit/registration/courtPresenter.equivalence.test.ts: app/legacy/presenter (18 errors)
- tests/unit/registration/adminPresenter.equivalence.test.ts: app/handlers/legacy/presenter (18 errors)
- tests/unit/registration/appHandlers/state/useRegistrationHelpers.test.ts: findEngagementByMemberId/domainValidateGroup (21 errors)
- tests/unit/registration/appHandlers/useRegistrationAppState.test.ts: result (20 errors)
- tests/unit/admin/courts/useCourtActions.contract.test.ts: hookResult (16 errors)
- tests/unit/admin/useAdminHandlers.contract.test.ts: hookResult (7 errors)
- tests/unit/admin/guards/adminAccessGuard.test.ts: warnSpy (5 errors)
- tests/unit/courtboard/bridge/windowBridge.test.ts: savedCourtboardState/savedTennis (4 errors)
- tests/unit/domain/getCourtStatuses.test.ts: overtime/free/upcomingBlocks arrays (6 errors)
- tests/unit/shared/utils/toast.test.ts: events/handler (20 errors)
- tests/unit/tennis/waitlist.test.ts: W (11 errors)
- tests/unit/registration/success/useBallPurchase.test.ts: resolveFirst (2 errors)
- tests/unit/shared/ErrorBoundary.test.tsx: consoleErrorSpy (3 errors)
- tests/unit/lib/ctaBlockFilter.test.ts: upcomingBlocks (2 errors)
- tests/unit/lib/deferredWaitlist.test.ts: waitlist (2 errors)
- tests/unit/registration/appHandlers/state/useRegistrationDerived.test.ts: unmount (2 errors)
- tests/unit/registration/courtPresenter.test.ts: callOrder (2 errors)
- tests/unit/registration/memberIdentity/useMemberIdentity.test.ts: resolveFirst (2 errors)

### Type patterns used
- `(value: unknown) => void` for deferred promise resolve functions
- `Promise<unknown>` for deferred promise holders
- `any` for complex mock objects (mockDeps, mockBackend, hookResult, W, warnSpy, etc.)
- `ReturnType<typeof createRoot>` for React root refs
- `CustomEvent[]` and `(e: Event) => void` for event handler types
- `number[]` for arrays filled with court numbers
- `Record<string, unknown>[]` for generic empty arrays
- `(() => void) | null` for nullable cleanup functions
- `string[]` for string accumulator arrays

### Notes
- TS7005 and TS7034 completely eliminated (0 remaining)
- TS7006 reduced from 221 to 220 (1 fixed by cascade)
- TS18048 reduced from 125 to 85 (cascade from fixing outer let types)
- TS2345 slightly increased from 566 to 567 (new strict checks from typed vars)

---

## Current Baseline: 2691 errors (after iteration 3)

### Current Distribution
TS18046: 576 (0)
TS2345: 567 (+1)
TS18047: 298 (0)
TS2322: 279 (0)
TS7006: 220 (-1)
TS2571: 199 (0)
TS2339: 165 (0)
TS2353: 85 (0)
TS18048: 85 (-40)
TS7053: 47 (0)
TS7031: 41 (0)
TS2769: 19 (0)
TS7005: 0 (-334)
TS7034: 0 (-94)

Next target: TS18046 (576) — nullability violations (possibly undefined/null values accessed without narrowing)
Top pattern: Use non-null assertions (!) where test itself validates value existence
Approach: Scan for `.find()`, optional chain results, and computed values accessed in tests

---

## Iteration 4 — 2026-03-31
Pattern fixed: TS18046 — `React.createRef()` without generic causes `ref.current` typed as `unknown`
Errors before: 2691
Errors after: 2162
Reduction: 529 errors (-20%)

### Files fixed
- tests/unit/admin/blocks/useBlockForm.test.tsx: `React.createRef()` → `React.createRef<ReturnType<typeof useBlockForm>>() as { current: ReturnType<typeof useBlockForm> }` (165 → 0 TS18046)
- tests/unit/admin/wetCourts/useWetCourts.test.tsx: same pattern for `useWetCourts` (127 → 0 TS18046)
- tests/unit/registration/search/useMemberSearch.test.ts: same pattern for `useMemberSearch` (65 → 0 TS18046)
- tests/unit/admin/hooks/useAdminSettings.test.tsx: same pattern for `useAdminSettings` (56 → 0 TS18046)
- tests/unit/registration/memberIdentity/useMemberIdentity.test.ts: same pattern for `useMemberIdentity` (49 → 0 TS18046)
- tests/unit/registration/waitlist/useWaitlistAdmin.test.ts: same pattern for `useWaitlistAdmin` (20 → 0 TS18046)
- tests/unit/registration/ui/mobile/useMobileFlowController.test.ts: same pattern for `useMobileFlowController` (15 → 0 TS18046)
- tests/unit/admin/blocks/useBlockForm.test.tsx: also fixed TS7006 (`makeValid(h)` param) and TS18047 (`originalValues!`) cascade fixes

### Type patterns used
- `React.createRef<ReturnType<typeof useHook>>() as { current: ReturnType<typeof useHook> }` — typed non-null ref cast for harness createRef calls
- `ReturnType<typeof createHarness>` — for helper function parameter types
- Non-null assertion `originalValues!` — for known-initialized optional values

### Notes
- First attempt: `React.createRef<ReturnType<typeof useHook>>()` alone converts TS18046 → TS18047 (unknown → null). Must cast as non-null `{ current: T }` to fully resolve.
- TS18046 reduced from 576 → 79 (−497). Remaining 79 are in different files/patterns.
- TS2345, TS2339 slightly increased (cascade from newly typed refs exposing pre-existing mismatches in useWetCourts).

---

## Current Baseline: 2162 errors (after iteration 4)

### Current Distribution
TS18046: 576 → 79 (−497)
TS18047: 298 (unchanged)
TS2345: 567 → 569 (+2 cascade)
TS2322: 279 (unchanged)
TS7006: 220 → 219 (−1)
TS2571: 199 → 161 (−38, cascade from typed refs)
TS2339: 165 → 171 (+6 cascade)
TS2353: 85 → 86 (+1)
TS18048: 85 (unchanged)
TS7053: 47 (unchanged)
TS7031: 41 (unchanged)

Next target: TS18047 (298) — "possibly null" violations. Non-null assertions (`!`) at access sites.
Top files: audit remaining 79 TS18046 first (smaller, may combine), then tackle TS18047 pattern.
