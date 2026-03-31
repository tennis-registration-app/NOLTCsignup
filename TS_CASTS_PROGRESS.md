# TS Casts Progress

## Audit Date: 2026-03-31

## Total Count
- **Starting count: 68**
- **Current count: 58** (after iteration 1)

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
