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

## Current Baseline: 3322 errors (after iteration 1)

### Current Distribution
TS7005: 821 -> 471 (-350)
TS18046: 576 -> 576 (0)
TS2345: 559 -> 559 (0)
TS18047: 305 -> 298 (-7)
TS2322: 279 -> 279 (0)
TS7006: 222 -> 222 (0)
TS2571: 199 -> 199 (0)
TS2339: 165 -> 165 (0)
TS7034: 150 -> 127 (-23)
TS18048: 124 -> 124 (0)
TS2353: 85 -> 85 (0)

Next target: Remaining TS7005/TS7034 (471+127 = 598 remaining)
Top files: useRegistrationDataLayer.test.ts, adminSettingsLogic.test.ts, useRegistrationRuntime.test.ts
Approach: Type outer let variables; use as unknown as Type cast for strict interface mocks.