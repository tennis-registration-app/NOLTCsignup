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