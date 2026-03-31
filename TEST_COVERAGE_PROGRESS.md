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
| src/registration/search/useMemberSearch.ts | 66 | 48 | DONE | 32 tests (useMemberSearch.test.ts) |
| src/admin/hooks/useAdminHandlers.ts | 45 | 11 | SKIP | contract test exists (useAdminHandlers.contract.test.ts); logic is in operation modules already tested |
| src/registration/group/useGroupGuest.ts | 45 | 8 | DONE | 27 tests (useGroupGuest.test.ts) |
| src/registration/blocks/useBlockAdmin.ts | 55 | 10 | DONE | 20 tests (useBlockAdmin.test.ts) |

## Priority 2: Utility/Helper Functions

| File | Stmt% | Fn% | Status | Tests |
|------|-------|-----|--------|-------|
| src/registration/ui/adminPriceFeedback/useAdminPriceFeedback.ts | 50 | 17 | DONE | 9 tests (useAdminPriceFeedback.test.ts) |
| src/registration/ui/alert/useAlertDisplay.ts | 50 | 17 | DONE | 10 tests (useAlertDisplay.test.ts) |
| src/registration/ui/guestCounter/useGuestCounter.ts | 67 | 33 | DONE | 5 tests (useGuestCounter.test.ts) |
| src/registration/streak/useStreak.ts | 60 | 20 | DONE | 7 tests (useStreak.test.ts) |
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



### Iteration 9 — 2026-03-30
Files tested: 4, Tests added: 31
- src/registration/ui/adminPriceFeedback/useAdminPriceFeedback.ts (9 tests): initial state, setShowPriceSuccess (true/false), setPriceError (set/clear), showPriceSuccessWithClear (clears error + sets true + auto-hides at 3000ms + not before), resetAdminPriceFeedback (clears both fields)
- src/registration/ui/alert/useAlertDisplay.ts (10 tests): initial state, setShowAlert (true/false), setAlertMessage (without affecting visibility), showAlertMessage (immediate show, auto-hide at 3000ms, not before 3000ms, custom alertDurationMs, message preserved after hide), resetAlertDisplay (clears both fields)
- src/registration/ui/guestCounter/useGuestCounter.ts (5 tests): initial state (starts at 1), incrementGuestCounter (1→2, chains to 4), setGuestCounter (arbitrary value), no-reset contract (counter survives form reset)
- src/registration/streak/useStreak.ts (7 tests): initial state (3 defaults), setRegistrantStreak, setShowStreakModal (open/close), setStreakAcknowledged, resetStreak (all fields back to defaults, scoped to streak only)
- npm run verify: all green
- Next: src/registration/waitlist/useWaitlistAdmin.ts

### Iteration 8 — 2026-03-30
Files tested: 1, Tests added: 20
- src/registration/blocks/useBlockAdmin.ts (20 tests): initial state (7 defaults), setShowBlockModal (open/close/preserves-blockingInProgress legacy), setSelectedCourtsToBlock, setBlockMessage, setBlockStartTime, setBlockEndTime, setBlockWarningMinutes, setBlockingInProgress (true/false), onBlockCreate (state wiring + setBlockingInProgress forwarding), onCancelBlock (blockId+courtNum delegation)
- npm run verify: all green
- Next: src/registration/ui/adminPriceFeedback/useAdminPriceFeedback.ts

### Iteration 7 — 2026-03-30
Files tested: 1, Tests added: 27
- src/registration/group/useGroupGuest.ts (27 tests): initial state (6 defaults), setters (setCurrentGroup, setGuestName, setGuestSponsor, setShowGuestForm, setShowGuestNameError, setShowSponsorError), handleRemovePlayer (middle/first/last index), handleSelectSponsor (sets sponsor, clears sponsorError, leaves guestNameError), handleCancelGuest (hides form, clears all 4 fields, preserves currentGroup), resetGuestForm (clears guest fields, preserves currentGroup), resetGroup (clears group + all guest fields), resetGroup vs resetGuestForm distinction
- Note: src/admin/hooks/useAdminHandlers.ts skipped — already has contract test; operation modules (waitlistOperations, courtOperations) already have their own tests
- npm run verify: all green
- Next: src/registration/blocks/useBlockAdmin.ts

### Iteration 6 — 2026-03-30
Files tested: 1, Tests added: 32
- src/registration/search/useMemberSearch.ts (32 tests): initial state (3 defaults), loadMembers on mount (members loaded, error keeps empty array), getAutocompleteSuggestions (empty input, no members loaded, member-number prefix, first-name prefix, last-name prefix, multi-word all-match, no match, result cap at 5, displayText shape, name fallback), handleGroupSearchChange (updates input, calls markUserTyping, shows/hides suggestions, admin code nav+clear), handleGroupSearchFocus (markUserTyping, shows/no-shows suggestions), handleAddPlayerSearchChange (updates, shows/hides suggestions), handleAddPlayerSearchFocus (shows/no-shows), effectiveSearchInput numeric bypass, resetLeaderSearch, resetAddPlayerSearch, resetAllSearch (preserves apiMembers)
- npm run verify: all green
- Next: src/admin/hooks/useAdminHandlers.ts
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
