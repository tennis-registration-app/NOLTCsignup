# WP5.6 Checkpoint: R6 UI Flow & Modal State Extraction

**Date:** 2026-01-28
**Branch:** phase-3-5/wp1-batch1-unused-vars
**Status:** Complete

## Summary

WP5.6 extracted Tier 1 "safe" UI state clusters from App.jsx using the reducer + hook pattern established in WP5.3-5.5. Two Tier 2 candidates were investigated and correctly reclassified to Tier 3 (defer) due to coupling complexity.

## Extractions Completed

### R6a-1: Alert Display Cluster

**Files created:**
- `src/registration/ui/alert/alertDisplayReducer.js`
- `src/registration/ui/alert/useAlertDisplay.js`
- `src/registration/ui/alert/index.js`
- `tests/unit/registration/ui/alert/alertDisplayReducer.test.js`

**State extracted:**
- `showAlert` (boolean)
- `alertMessage` (string)

**Actions:**
- `SHOW` - sets message and shows alert
- `HIDE` - clears message and hides alert
- `RESET` - returns to initial state

### R6a-2: Admin Price Feedback Cluster

**Files created:**
- `src/registration/ui/adminPriceFeedback/adminPriceFeedbackReducer.js`
- `src/registration/ui/adminPriceFeedback/useAdminPriceFeedback.js`
- `src/registration/ui/adminPriceFeedback/index.js`
- `tests/unit/registration/ui/adminPriceFeedback/adminPriceFeedbackReducer.test.js`

**State extracted:**
- `showPriceSuccess` (boolean)
- `priceError` (string|null)

**Actions:**
- `SHOW_SUCCESS` - shows success indicator
- `HIDE_SUCCESS` - hides success indicator
- `SET_ERROR` - sets error message
- `CLEAR_ERROR` - clears error message
- `RESET` - returns to initial state

### R6a-3: Guest Counter Cluster

**Files created:**
- `src/registration/ui/guestCounter/guestCounterReducer.js`
- `src/registration/ui/guestCounter/useGuestCounter.js`
- `src/registration/ui/guestCounter/index.js`
- `tests/unit/registration/ui/guestCounter/guestCounterReducer.test.js`

**State extracted:**
- `guestCounter` (number, starts at 1)

**Actions:**
- `INCREMENT` - increments counter by 1
- `SET` - sets counter to specific value
- `RESET` - returns to initial state

**Note:** Guest counter is intentionally NOT reset on form reset to ensure unique negative IDs across sessions.

## New Unit Tests

- alertDisplayReducer: 8 tests
- adminPriceFeedbackReducer: 10 tests
- guestCounterReducer: 6 tests
- **Total: 24 new unit tests**

## Tier 2 Investigations and Reclassifications

Two Tier 2 candidates were investigated and reclassified to Tier 3 (defer):

### `showTimeoutWarning` → Tier 3

**Reason:** Tightly coupled to timeout orchestration logic:
- `updateActivity()` function
- `timeoutTimerRef` and `warningTimerRef`
- `currentScreen` dependency
- `applyInactivityTimeoutExitSequence()` call

Extracting state-only would provide minimal value. Requires dedicated Timeout System containment pass.

### `mobileCountdown` → Tier 3

**Reason:** Mixed-responsibility useEffect:
- Handles `postMessage` to parent window (mobile communication)
- Manages countdown interval
- Dependencies: `showSuccess`, `justAssignedCourt`, `mobileFlow`, `preselectedCourt`

Extracting state-only would leave interval logic orphaned. Requires dedicated Mobile Flow containment pass.

## Remaining State — Defer Buckets

The following clusters remain in App.jsx and are intentionally deferred:

| Bucket | Variables | Reason |
|--------|-----------|--------|
| **Navigation Hub** | `currentScreen`, `availableCourts`, `showSuccess` | Central routing, 17+ reads, 18+ setters, multiple useEffect deps |
| **Timeout System** | `showTimeoutWarning`, `lastActivity`, timer refs | Coupled to `updateActivity()` and timeout exit sequence |
| **Mobile Flow** | `mobileCountdown`, `mobileFlow`, `preselectedCourt`, `mobileMode`, `showQRScanner`, `gpsFailedPrompt`, `locationToken`, `checkingLocation` | Mixed postMessage/countdown effect, geolocation logic |
| **Court Change/Overtime** | `canChangeCourt`, `changeTimeRemaining`, `isChangingCourt`, `wasOvertimeCourt`, `originalCourtData`, `replacedGroup`, `displacement` | Orchestration-adjacent, timer-based change window |
| **Waitlist Metadata** | `hasWaitlistPriority`, `currentWaitlistEntryId`, `waitlistPosition` | Orchestration-adjacent |
| **Admin Operations** | `courtToMove`, `ballPriceInput`, `ballPriceCents` | Admin-specific, low priority |

## Stop Line

**WP5.6 closed.** No further Tier 2 extractions until dedicated containment work packages are opened:
- WP5.7 Timeout System Containment
- WP5.8 Mobile Flow Containment

## Metrics Snapshot

| Metric | Value |
|--------|-------|
| useState extracted (WP5.6) | 5 |
| useState extracted (total) | 37 |
| useState remaining | ~36 |
| **Extraction rate** | **37/73 (51%)** |
| App.jsx lines (after WP5.6) | 2,738 |
| Unit tests | 267+ passing |
| E2E tests | 15/15 passing |
| Regressions | Zero |

## Commit Log

| Commit | Description |
|--------|-------------|
| 03b40f7 | feat(ui/alert): add alertDisplayReducer + unit tests |
| ed69730 | feat(ui/alert): add useAlertDisplay hook |
| 66760d9 | refactor(ui/alert): integrate useAlertDisplay into App.jsx |
| 295b684 | feat(ui/adminPriceFeedback): add adminPriceFeedbackReducer + unit tests |
| c2fa2f3 | feat(ui/adminPriceFeedback): add useAdminPriceFeedback hook |
| ca3ab23 | refactor(ui/adminPriceFeedback): integrate useAdminPriceFeedback into App.jsx |
| da3e6ec | feat(ui/guestCounter): add guestCounterReducer + unit tests |
| f241819 | feat(ui/guestCounter): add useGuestCounter hook |
| 5572f74 | refactor(ui/guestCounter): integrate useGuestCounter into App.jsx |

## Key Discovery

Tier 2 candidates proved to be "Tier 3 in disguise" — their coupling to timer refs, mixed-responsibility effects, and orchestration logic means state-only extraction provides minimal value. This discovery validates the tiering methodology and informs future containment work.

---

*WP5.6 completed. Tier 1 UI state extracted. Tier 2 correctly reclassified to Tier 3.*
