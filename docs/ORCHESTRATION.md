# Orchestration Architecture

## Overview

This document defines orchestration patterns used in the NOLTC Tennis Registration System. Orchestrators coordinate flows involving backend mutations, state updates, device signaling, timers, and user feedback.

---

## Orchestrator Contracts

### assignCourtToGroupOrchestrated (v0 — Frozen)

**Location:** `src/registration/orchestration/assignCourtOrchestrator.js`

**Export (observed):**
```
62:export async function assignCourtToGroupOrchestrated(courtNumber, selectableCountAtSelection, deps)
```

**Return:** `void` (no return value; multiple early returns on error conditions)

**Parameters:**
- `courtNumber` — number, the court to assign
- `selectableCountAtSelection` — number, count of selectable courts at selection time
- `deps` — object, injected dependencies (see below)

**Observed deps Keys (from code analysis — lines 67-108):**

Read Values:
- `isAssigning`
- `mobileFlow`
- `preselectedCourt`
- `operatingHours`
- `currentGroup`
- `courts`
- `currentWaitlistEntryId`
- `CONSTANTS`

Setters:
- `setIsAssigning`
- `setCurrentWaitlistEntryId`
- `setHasWaitlistPriority`
- `setCurrentGroup`
- `setJustAssignedCourt`
- `setAssignedSessionId`
- `setReplacedGroup`
- `setDisplacement`
- `setOriginalCourtData`
- `setIsChangingCourt`
- `setWasOvertimeCourt`
- `setHasAssignedCourt`
- `setCanChangeCourt`
- `setChangeTimeRemaining`
- `setIsTimeLimited`
- `setTimeLimitReason`
- `setShowSuccess`
- `setGpsFailedPrompt`

Services:
- `backend`

Helpers:
- `getCourtBlockStatus`
- `getMobileGeolocation`
- `showAlertMessage`
- `validateGroupCompat`
- `clearSuccessResetTimer`
- `resetForm`
- `successResetTimerRef`
- `dbg`
- `API_CONFIG`

**Call Sites (observed):**

| File | Purpose |
|------|---------|
| `src/registration/orchestration/index.js` | Re-export |
| `src/registration/appHandlers/handlers/courtHandlers.js` | Import + call |
| `src/registration/appHandlers/useRegistrationAppState.js` | Import + expose |
| `src/registration/appHandlers/state/buildRegistrationReturn.js` | Import + expose |
| `src/registration/appHandlers/useRegistrationHandlers.js` | Import + expose |

---

## Observed Behavior — Side Effects & Ordering

### 1. Guards / Validation (Early Returns + User Feedback)

- `isAssigning` guard — prevents double-submit
- Operating hours validation — checks if courts are open
- Court number validation — ensures valid court selection
- Group validation — checks player count and configuration
- Block warning confirmation — prompts user if court has upcoming block

### 2. Waitlist Assignment Path (when `currentWaitlistEntryId` exists)

1. Backend mutation: `backend.commands.assignFromWaitlist()`
2. Optional refresh: `backend.queries.refresh()`
3. State updates (setters listed below)
4. Mobile success signal: `getUI().__mobileSendSuccess__()`
5. Timer: `setTimeout()` stored in `successResetTimerRef.current`

### 3. Direct Assignment Path

1. State: `setIsAssigning(true)`
2. Backend mutation: `backend.commands.assignCourtWithPlayers()`
3. Optional refresh: `backend.queries.refresh()`
4. State: `setIsAssigning(false)` (multiple locations on success/error)
5. State updates (setters listed below)
6. Mobile success signal: `getUI().__mobileSendSuccess__()`
7. Timers:
   - `setTimeout()` stored in `successResetTimerRef.current`
   - `setInterval()` for countdown timer display

### 4. Logging (Throughout)

- `logger.debug('AssignCourt', ...)` — diagnostic logging
- `logger.error('AssignCourt', ...)` — error logging

---

## State Setters Used (Behavior Lock)

The following React state setters are called by this orchestrator:

```
setAssignedSessionId
setCanChangeCourt
setChangeTimeRemaining
setCurrentGroup
setCurrentWaitlistEntryId
setDisplacement
setGpsFailedPrompt
setHasAssignedCourt
setHasWaitlistPriority
setIsAssigning
setIsChangingCourt
setIsTimeLimited
setJustAssignedCourt
setOriginalCourtData
setReplacedGroup
setShowSuccess
setTimeLimitReason
setWasOvertimeCourt
```

**Count: 18 setters**

Note: Any change to this list indicates a behavior change and requires explicit approval.

---

## Timer Usage (Behavior Lock)

Timer APIs observed:

| Line | Usage |
|------|-------|
| 334 | `successResetTimerRef.current = setTimeout(() => {` |
| 470 | `successResetTimerRef.current = setTimeout(() => {` |
| 477 | `const timer = setInterval(() => {` |
| 480 | `clearInterval(timer);` |

Timer refs used:
- `successResetTimerRef.current` — stores setTimeout for success screen auto-reset (lines 334-335, 470-471)
- Local `timer` variable — stores setInterval for countdown display (line 477)

Clearing behavior:
- `clearSuccessResetTimer()` is called before setting new setTimeout (lines 333, 469)
- `clearInterval(timer)` is called when countdown reaches 0 (line 480)

---

## Failure Modes (Observed)

| Condition | Behavior |
|-----------|----------|
| Validation failure | Early return + `Tennis.UI.toast()` or `showAlertMessage()` |
| API exception | Catch → `Tennis.UI.toast()` → `setIsAssigning(false)` → return |
| API result `ok === false` | `Tennis.UI.toast()` → may set `setGpsFailedPrompt(true)` → return |

Note: Function never throws — all errors are handled internally with early returns.

---

## Platform Bridge Usage (Observed)

| Function | Purpose |
|----------|---------|
| `getTennisDomain()` | Time duration calculation |
| `getUI()` | Mobile success signal via `__mobileSendSuccess__()` |

---

## Legacy Global UI Calls (Explicitly Out of Scope)

Direct `Tennis.UI.toast(...)` calls exist in this file (12 occurrences). These are NOT refactored in WP-HR4.

Candidate for future work package: "WP-HRx: UI Feedback Adapter"

---

## WP-HR4 Scope and Invariants

### In Scope

- Internal refactor of `assignCourtOrchestrator.js`
- Extract pure validation helpers to `helpers/validation.js`
- Create explicit deps factory in `deps/createOrchestrationDeps.js`
- Use extracted helpers internally
- NO change to external export signature

### Out of Scope

- Any changes to direct `Tennis.UI.toast(...)` usage
- Any changes to admin flows (`src/admin/App.jsx`)
- Any changes to other orchestrators (`waitlistOrchestrator`, `memberSelectionOrchestrator`)
- Any changes to the 18 state setters
- Any changes to timer behavior

### Invariants (Must Preserve)

1. Exported function name + signature unchanged
2. Return remains `void` (no return shape introduced)
3. No throw/return semantic changes (early return behavior preserved)
4. No new network calls
5. No new `await` statements (except wrapping existing async calls)
6. Side-effect ordering preserved for both waitlist and direct paths
7. Timer behavior preserved (`setTimeout`/`setInterval` usage unchanged)
8. All current call sites continue to work unchanged
9. State setter list unchanged (18 setters)

---

## Verification Commands

After WP-HR4 refactor, verify:

```bash
# No direct window.* in orchestrators (excluding legacy patterns)
rg "window\." src/registration/orchestration --glob "*.js" | grep -v "// legacy"

# No console.* in orchestrators
rg "console\." src/registration/orchestration --glob "*.js"

# Export signature unchanged
rg "^export" src/registration/orchestration/assignCourtOrchestrator.js

# Setter list unchanged (compare to documented list above)
rg -o "set[A-Z][A-Za-z0-9_]*\(" src/registration/orchestration/assignCourtOrchestrator.js | sed 's/(//' | sort -u
```

---

## Folder Structure (After WP-HR4)

```
src/registration/orchestration/
├── index.js                         # Re-exports
├── assignCourtOrchestrator.js       # Main orchestrator (refactored internally)
├── waitlistOrchestrator.js          # (unchanged in WP-HR4)
├── memberSelectionOrchestrator.js   # (unchanged in WP-HR4)
├── deps/
│   ├── index.js                     # Re-exports
│   └── createOrchestrationDeps.js   # Deps factory
└── helpers/
    ├── index.js                     # Re-exports
    └── validation.js                # Pure validation helpers
```
