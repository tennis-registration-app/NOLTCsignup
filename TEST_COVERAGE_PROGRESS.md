# Test Coverage Progress

Generated: 2026-03-30
Overall baseline: Statements 53.4% | Branches 47.9% | Functions 45.1% | Lines 53.6%

---

## Priority 1: Complex Logic — High Value

| File | Stmt% | Fn% | Status | Tests |
|------|-------|-----|--------|-------|
| src/admin/blocks/utils/blockValidation.ts | 0 | 0 | DONE | 18 tests (blockValidation.test.ts) |
| src/registration/appHandlers/state/useRegistrationDerived.ts | 64 | 60 | DONE | 15 tests (useRegistrationDerived.test.ts) |
| src/registration/memberIdentity/useMemberIdentity.ts | 24 | 10 | DONE | 19 tests (useMemberIdentity.test.ts) |
| src/registration/ui/timeout/useSessionTimeout.ts | 24 | 29 | DONE | 17 tests (useSessionTimeout.test.ts) |
| src/registration/ui/mobile/useMobileFlowController.ts | 24 | 18 | DONE | 28 tests (useMobileFlowController.test.ts) |
| src/registration/screens/success/useBallPurchase.ts | 50 | 55 | DONE | 19 tests (useBallPurchase.test.ts) |
| src/registration/search/useMemberSearch.ts | 66 | 48 | TODO | — |
| src/admin/hooks/useAdminHandlers.ts | 45 | 11 | TODO | — |
| src/registration/group/useGroupGuest.ts | 45 | 8 | TODO | — |
| src/registration/blocks/useBlockAdmin.ts | 55 | 10 | TODO | — |

## Priority 2: Utility/Helper Functions

| File | Stmt% | Fn% | Status | Tests |
|------|-------|-----|--------|-------|
| src/registration/ui/adminPriceFeedback/useAdminPriceFeedback.ts | 50 | 17 | TODO | — |
| src/registration/ui/alert/useAlertDisplay.ts | 50 | 17 | TODO | — |
| src/registration/ui/guestCounter/useGuestCounter.ts | 67 | 33 | TODO | — |
| src/registration/streak/useStreak.ts | 60 | 20 | TODO | — |
| src/registration/waitlist/useWaitlistAdmin.ts | 67 | 33 | TODO | — |
| src/shared/utils/toast.ts | 67 | 100 | TODO | — |

## Priority 3: Presenters and Formatters

| File | Stmt% | Fn% | Status | Tests |
|------|-------|-----|--------|-------|
| src/registration/court/useCourtAssignmentResult.ts | 58 | 17 | TODO | — |
| src/admin/utils/adminRefresh.ts | 0 | 0 | TODO | — |

## Priority 4: Hooks with Testable Logic (already partially tested)

| File | Stmt% | Fn% | Status | Tests |
|------|-------|-----|--------|-------|
| src/registration/appHandlers/state/useRegistrationDomainHooks.ts | 83 | 50 | TODO | — |
| src/registration/appHandlers/state/useRegistrationUiState.ts | 84 | 80 | TODO | — |

---

## Skipped (per rules)
- All .tsx UI components (primarily JSX rendering)
- src/admin/analytics/* — analytics UI, not business logic
- src/admin/ai/* — complex UI components
- src/admin/calendar/* — calendar UI
- src/courtboard/* — already tested where important
- src/shared/bootstrap/* — side-effect entry points
- src/types/* — type definitions only
- src/registration/services/GeolocationService.ts — browser API wrapper
- src/admin/hooks/useAdminAppState.ts — React hook scaffold
- src/admin/hooks/useBoardSubscription.ts — event subscription

---

## Iteration Log



### Iteration 5 — 2026-03-30
Files tested: 1, Tests added: 19
- src/registration/screens/success/useBallPurchase.ts (19 tests): initial state (5 defaults), double-submit guard (ignores in-flight duplicate), sessionId resolution (prefers prop, falls back to assignedCourt.session.id), accountId lookup (uses group directly, looks up by memberNumber, uses first non-primary result), purchaseDetails (charge type=single, split type=split with non-guest last4), successful purchase (ballsPurchased=true, modal closed, isProcessingPurchase reset), API ok:false fallback (falls through to localStorage, setCache called, isProcessingPurchase reset), split fallback (splitAccountIds=null when <2 IDs resolved)
- npm run verify: all green
- Next: src/registration/search/useMemberSearch.ts
### Iteration 4 — 2026-03-30
Files tested: 1, Tests added: 28
- src/registration/ui/mobile/useMobileFlowController.ts (28 tests): initial state (8 defaults), all setters exported, getMobileGeolocation (non-mobile returns null, location_token path, geolocation unavailable, success path, error path), onQRScanToken (sets token, closes scanner, clears gpsFailedPrompt, calls toast, null toast safe), QR controls (openQRScanner, onQRScannerClose, dismissGpsPrompt), requestMobileReset (no postMessage in non-iframe), message listener register (mobileFlow=true, preselectedCourt set/not-set, unknown type ignored), message listener assign-from-waitlist (sets state, calls backend, error toast on ok:false, error toast on throw), success signal effect (countdown stays at 5 in jsdom — window.top===window.self guard, both mobileFlow-false and showSuccess-false cases)
- npm run verify: all green
- Next: src/registration/screens/success/useBallPurchase.ts
### Iteration 3 — 2026-03-30
Files tested: 1, Tests added: 17
- src/registration/ui/timeout/useSessionTimeout.ts (17 tests): initial state (showTimeoutWarning=false, setLastActivity called), non-group screens (no timers), warning timer (fires at 90s, not before), timeout timer (fires at 120s, calls showAlertMessage+onTimeout, not before), activity resets (click/touchstart/keypress all reset warning and delay timeout), cleanup (unmount and screen change both clear timers)
- npm run verify: all green
- Next: src/registration/ui/mobile/useMobileFlowController.ts
### Iteration 2 — 2026-03-30
Files tested: 1, Tests added: 19
- src/registration/memberIdentity/useMemberIdentity.ts (19 tests): guards (empty memberId, null/undefined backend), API transform shape, ok:false, error/throw path, cache dedup (in-flight skip), cache hit within TTL, clearCache re-fetch, resetMemberIdentity (preserves cache), resetMemberIdentityWithCache (clears cache), all 4 setters
- npm run verify: all green (lint, types, coverage improved)
- Next: src/registration/ui/timeout/useSessionTimeout.ts

### Iteration 1 — 2026-03-30
Files tested: 2, Tests added: 33
- src/admin/blocks/utils/blockValidation.ts (18 tests): hasValidTimes, hasReason, hasCourts — all branches
- src/registration/appHandlers/state/useRegistrationDerived.ts (15 tests): empty waitlist, canFirstGroupPlay, canSecondGroupPlay, deferred groups, passThroughEntry, isMobileView pass-through, data aliases
- npm run verify: 163 test files, 3167 tests — all green
- Next: src/registration/memberIdentity/useMemberIdentity.ts — fetchFrequentPartners cache logic

### Phase 0 — 2026-03-30
- Ran npx vitest run --coverage
- Identified 157 test files already in place
- Highest-value uncovered: blockValidation, useRegistrationDerived, useMemberIdentity, useSessionTimeout
