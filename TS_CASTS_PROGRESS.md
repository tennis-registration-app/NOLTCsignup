# TS Casts Progress

## Audit Date: 2026-03-31

## Total Count
- **Starting count: 68**
- **Current count: 48** (after iteration 2)

---

## Full Cast Inventory

### Priority 1 — buildHandlerDeps.ts (9 casts, Category A: direct property access fixes)
- L22: app.state spread cast — app.state is RegistrationUiState
- L30: app.setters spread cast — app.setters is RegistrationSetters
- L51: app.admin.blockAdmin cast — app.admin is AdminSlice
- L80: app.setters spread cast — duplicate of L30
- L103: app.session.guestCounterHook cast — app.session is SessionSlice
- L106: app.setters spread cast — duplicate of L30
- L124: app.admin.adminPriceFeedback cast — app.admin is AdminSlice
- L136: app.state spread cast — duplicate of L22
- L137: app.setters spread cast — duplicate of L30

### Priority 2 — useRegistrationAppState.ts (10 casts, Category B: structural)
- L158: availableCourts — types already match after runtime interface fix
- L159: backend — widen UseRegistrationRuntimeDeps.backend to TennisBackendShape
- L218: refresh return type — InactivityTimeoutDeps.refresh too narrow
- L277-289: module params to buildRegistrationReturn — sub-hook return type gaps

### Priority 3 — useRegistrationHandlers.ts (6 casts, Category B)
- L78: createResetDeps() vs ResetFormDeps
- L100,105,110,115,120: buildXxxHandlerDeps() vs handler param types

### Priority 4 — Admin files (19 casts) — later iterations
### Priority 5 — lib/ files (4 casts) — later iterations
### Priority 6 — Other registration files (8 casts) — later iterations

---

## Iteration Log

### Iteration 1 (2026-03-31) — Audit + First Batch
Target: 9 Category A casts in buildHandlerDeps.ts + refresh cast in useRegistrationAppState.ts
Status: COMPLETE

Casts fixed (10 total):
  buildHandlerDeps.ts L22: app.state spread — removed cast (RegistrationUiState is directly spreadable)
  buildHandlerDeps.ts L30: app.setters spread — removed cast (RegistrationSetters is directly spreadable)
  buildHandlerDeps.ts L51: app.admin.blockAdmin — removed cast (AdminSlice has .blockAdmin)
  buildHandlerDeps.ts L80: app.setters spread in buildGroupHandlerDeps — removed cast
  buildHandlerDeps.ts L103: app.session.guestCounterHook — removed cast (SessionSlice has .guestCounterHook)
  buildHandlerDeps.ts L106: app.setters spread in buildGuestHandlerDeps — removed cast
  buildHandlerDeps.ts L124: app.admin.adminPriceFeedback — removed cast (AdminSlice has .adminPriceFeedback)
  buildHandlerDeps.ts L136: app.state spread in buildNavigationHandlerDeps — removed cast
  buildHandlerDeps.ts L137: app.setters spread in buildNavigationHandlerDeps — removed cast
  resetOrchestrator.ts + useRegistrationAppState.ts: removed DomainBoard & Record<string,unknown> widening,
    enabling removal of refresh cast at useRegistrationAppState.ts L218

Next iteration targets: useRegistrationAppState.ts lines 158-159, 277-289 (module params to buildRegistrationReturn)

## Current State
- **48 casts remaining** after iteration 2


### Iteration 2 (2026-03-31) — useRegistrationAppState + useRegistrationHandlers
Target: 10 casts in useRegistrationAppState.ts + 1 in useRegistrationHandlers.ts
Status: COMPLETE

Casts fixed (10 total):
  useRegistrationAppState.ts L158: availableCourts cast — removed (both are number[])
  useRegistrationAppState.ts L159: backend cast — removed (typed const backend: TennisBackendShape)
  useRegistrationAppState.ts L284: backend in buildRegistrationReturn — removed (typed as TennisBackendShape)
  useRegistrationAppState.ts L289: TennisBusinessLogic cast — reduced to single as (not as unknown as)
  useRegistrationAppState.ts L277-282: ui/domain/_dataLayer/helpers/derived casts — removed all 5
    - Fixed useRegistrationRuntime.ts backend type (import TennisBackendShape)
    - Fixed appTypes.ts: currentTime: number->Date, calculateEstimatedWaitTime/checkGroupOverlap/getOriginalEndTimeForGroup use Record<string,unknown>[] not GroupPlayer[], BlockAdminState.setBlockWarningMinutes Setter<number>, HelperFunctions.loadData Promise<unknown>, WaitlistEntrySummary id/position types
    - Fixed useMemberSearch.ts: local ApiMember.id/accountId unknown->string
    - Fixed useRegistrationDerived.ts: use DomainWaitlistEntry[], remove map annotation, fix passThrough/db types
    - Fixed useMobileFlowController.ts: add explicit Promise<...> return type
    - Fixed adminPresenter.ts: currentTime number->Date
  useRegistrationHandlers.ts L78: createResetDeps cast — removed

Current count: **48** (was 58 at start of iteration 1, 58 now)
Remaining: useRegistrationHandlers.ts L100-120 (5 buildHandlerDeps casts, Category B — WorkflowProvider unknown fields)

Next iteration targets: Fix WorkflowContext types (GroupGuestState, StreakState, MemberIdentityState) + dataStore null in UseAdminHandlersDeps
