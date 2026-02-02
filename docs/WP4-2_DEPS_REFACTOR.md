# WP4-2: Dependency Object Refactor Plan

**Date:** 2026-02-02
**Baseline:** 466 unit tests, 15 E2E tests, npm run verify green

---

## Targets

| Orchestrator | Current Keys | Target | Priority |
|-------------|-------------|--------|----------|
| resetOrchestrator.js | 36 | ≤25 | 1st |
| memberSelectionOrchestrator.js | 16 | ≤18 | 2nd (already under) |
| assignCourtOrchestrator.js | 36 | ≤18 | 3rd |
| waitlistOrchestrator.js | ~12 | defer | — |
| courtChangeOrchestrator.js | ~8 | defer | — |

---

## resetOrchestrator.js (36 keys → ≤25)

### Function Signature
```javascript
export function resetFormOrchestrated(deps) {
  const {
    // Setters
    setCurrentGroup,
    setShowSuccess,
    setMemberNumber,
    setCurrentMemberId,
    setJustAssignedCourt,
    setAssignedSessionId,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setCanChangeCourt,
    setIsTimeLimited,
    setCurrentScreen,
    setSearchInput,
    setShowSuggestions,
    setShowAddPlayer,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    setWaitlistPosition,
    setSelectedCourtToClear,
    setClearCourtStep,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCourtToMove,
    setHasAssignedCourt,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
    // Helpers
    clearCache,
    clearSuccessResetTimer,
  } = deps;
```

### Destructured Keys Classified

| # | Key | Category | Used For |
|---|-----|----------|----------|
| 1 | setCurrentGroup | setter | Resets group to empty array |
| 2 | setShowSuccess | setter | Hides success screen |
| 3 | setMemberNumber | setter | Clears member number input |
| 4 | setCurrentMemberId | setter | Clears current member ID |
| 5 | setJustAssignedCourt | setter | Clears assigned court number |
| 6 | setAssignedSessionId | setter | Clears session ID |
| 7 | setReplacedGroup | setter | Clears replaced group data |
| 8 | setDisplacement | setter | Clears displacement info |
| 9 | setOriginalCourtData | setter | Clears original court snapshot |
| 10 | setCanChangeCourt | setter | Disables court change option |
| 11 | setIsTimeLimited | setter | Clears time limit flag |
| 12 | setCurrentScreen | setter | Navigates to home screen |
| 13 | setSearchInput | setter | Clears search input |
| 14 | setShowSuggestions | setter | Hides suggestions dropdown |
| 15 | setShowAddPlayer | setter | Hides add player panel |
| 16 | setAddPlayerSearch | setter | Clears add player search |
| 17 | setShowAddPlayerSuggestions | setter | Hides add player suggestions |
| 18 | setHasWaitlistPriority | setter | Clears waitlist priority flag |
| 19 | setCurrentWaitlistEntryId | setter | Clears waitlist entry ID |
| 20 | setWaitlistPosition | setter | Resets waitlist position to 0 |
| 21 | setSelectedCourtToClear | setter | Clears court clear selection |
| 22 | setClearCourtStep | setter | Resets clear court step to 1 |
| 23 | setIsChangingCourt | setter | Clears court change flag |
| 24 | setWasOvertimeCourt | setter | Clears overtime court flag |
| 25 | setCourtToMove | setter | Clears court move target |
| 26 | setHasAssignedCourt | setter | Clears assigned court flag |
| 27 | setShowGuestForm | setter | Hides guest form |
| 28 | setGuestName | setter | Clears guest name |
| 29 | setGuestSponsor | setter | Clears guest sponsor |
| 30 | setShowGuestNameError | setter | Hides guest name error |
| 31 | setShowSponsorError | setter | Hides sponsor error |
| 32 | setRegistrantStreak | setter | Resets streak to 0 |
| 33 | setShowStreakModal | setter | Hides streak modal |
| 34 | setStreakAcknowledged | setter | Clears streak acknowledgment |
| 35 | clearCache | service | Clears frequent partners cache |
| 36 | clearSuccessResetTimer | service | Clears pending success timer |

### Category Summary
- **State reads:** 0 keys
- **Setters:** 34 keys — setCurrentGroup, setShowSuccess, setMemberNumber, setCurrentMemberId, setJustAssignedCourt, setAssignedSessionId, setReplacedGroup, setDisplacement, setOriginalCourtData, setCanChangeCourt, setIsTimeLimited, setCurrentScreen, setSearchInput, setShowSuggestions, setShowAddPlayer, setAddPlayerSearch, setShowAddPlayerSuggestions, setHasWaitlistPriority, setCurrentWaitlistEntryId, setWaitlistPosition, setSelectedCourtToClear, setClearCourtStep, setIsChangingCourt, setWasOvertimeCourt, setCourtToMove, setHasAssignedCourt, setShowGuestForm, setGuestName, setGuestSponsor, setShowGuestNameError, setShowSponsorError, setRegistrantStreak, setShowStreakModal, setStreakAcknowledged
- **Services:** 2 keys — clearCache, clearSuccessResetTimer
- **UI effects:** 0 keys (setCurrentScreen is a setter, not a direct UI effect)

### Call Sites
| File | Line | Context |
|------|------|---------|
| src/registration/appHandlers/useRegistrationHandlers.js | 144 | Inline object literal with 36 keys spread directly |

### Test Coverage
| Test File | Approx Test Count | What It Covers |
|-----------|-------------------|----------------|
| tests/unit/orchestration/index.test.js | 1 | Verifies export exists |
| e2e/registration-happy-path.spec.js | (indirect) | Full registration flow includes reset |

### Proposed Grouping (Draft)
```javascript
// Target shape after refactor:
{
  services: { clearCache, clearSuccessResetTimer },
  actions: {
    // Group state
    setCurrentGroup,
    // Member identity
    setMemberNumber, setCurrentMemberId,
    // Court assignment
    setJustAssignedCourt, setAssignedSessionId, setReplacedGroup,
    setDisplacement, setOriginalCourtData, setCanChangeCourt,
    setIsTimeLimited, setHasAssignedCourt,
    // Navigation
    setCurrentScreen,
    // Search UI
    setSearchInput, setShowSuggestions,
    setShowAddPlayer, setAddPlayerSearch, setShowAddPlayerSuggestions,
    // Waitlist
    setHasWaitlistPriority, setCurrentWaitlistEntryId, setWaitlistPosition,
    // Court operations
    setSelectedCourtToClear, setClearCourtStep,
    setIsChangingCourt, setWasOvertimeCourt, setCourtToMove,
    // Guest
    setShowGuestForm, setGuestName, setGuestSponsor,
    setShowGuestNameError, setShowSponsorError,
    // Streak
    setRegistrantStreak, setShowStreakModal, setStreakAcknowledged,
    // Success
    setShowSuccess,
  },
}
```

**Note:** This orchestrator is pure setter calls — may benefit from a "resetAllState" batch action rather than individual setters.

---

## memberSelectionOrchestrator.js (16 keys → ≤18)

**Status:** Already under target. Document for completeness.

### Function Signature
```javascript
export async function handleSuggestionClickOrchestrated(suggestion, deps) {
  const {
    // Read values
    currentGroup,
    // Setters
    setSearchInput,
    setShowSuggestions,
    setMemberNumber,
    setCurrentMemberId,
    setRegistrantStreak,
    setStreakAcknowledged,
    setCurrentGroup,
    setCurrentScreen,
    // Services/helpers
    backend,
    fetchFrequentPartners,
    isPlayerAlreadyPlaying,
    guardAddPlayerEarly,
    getCourtData,
    getAvailableCourts,
    showAlertMessage,
  } = deps;
```

### Destructured Keys Classified

| # | Key | Category | Used For |
|---|-----|----------|----------|
| 1 | currentGroup | state-read | Check if first player (streak tracking) |
| 2 | setSearchInput | setter | Clear search after selection |
| 3 | setShowSuggestions | setter | Hide suggestions dropdown |
| 4 | setMemberNumber | setter | Store selected member number |
| 5 | setCurrentMemberId | setter | Store selected member ID |
| 6 | setRegistrantStreak | setter | Track uncleared session streak |
| 7 | setStreakAcknowledged | setter | Track streak acknowledgment |
| 8 | setCurrentGroup | setter | Add player to group |
| 9 | setCurrentScreen | setter | Navigate to group screen |
| 10 | backend | service | Directory API for fresh streak data |
| 11 | fetchFrequentPartners | service | Pre-fetch partners (fire-and-forget) |
| 12 | isPlayerAlreadyPlaying | service | Check if player on court/waitlist |
| 13 | guardAddPlayerEarly | service | Duplicate guard with toast |
| 14 | getCourtData | service | Get court data for guard |
| 15 | getAvailableCourts | service | Check courts for waitlist player |
| 16 | showAlertMessage | ui-effect | Display validation alerts |

### Category Summary
- **State reads:** 1 key — currentGroup
- **Setters:** 8 keys — setSearchInput, setShowSuggestions, setMemberNumber, setCurrentMemberId, setRegistrantStreak, setStreakAcknowledged, setCurrentGroup, setCurrentScreen
- **Services:** 6 keys — backend, fetchFrequentPartners, isPlayerAlreadyPlaying, guardAddPlayerEarly, getCourtData, getAvailableCourts
- **UI effects:** 1 key — showAlertMessage

### Call Sites
| File | Line | Context |
|------|------|---------|
| src/registration/appHandlers/handlers/groupHandlers.js | 182 | Inline object literal with 16 keys |

### Test Coverage
| Test File | Approx Test Count | What It Covers |
|-----------|-------------------|----------------|
| tests/unit/orchestration/index.test.js | 1 | Verifies export exists |
| e2e/registration-happy-path.spec.js | (indirect) | Member selection in flow |

### Proposed Grouping (Draft)
```javascript
// Target shape (already clean):
{
  state: { currentGroup },
  actions: {
    setSearchInput, setShowSuggestions,
    setMemberNumber, setCurrentMemberId,
    setRegistrantStreak, setStreakAcknowledged,
    setCurrentGroup, setCurrentScreen,
  },
  services: {
    backend,
    fetchFrequentPartners,
    isPlayerAlreadyPlaying,
    guardAddPlayerEarly,
    getCourtData,
    getAvailableCourts,
  },
  ui: { showAlertMessage },
}
```

---

## assignCourtOrchestrator.js (36 keys → ≤18)

### Function Signature
```javascript
export async function assignCourtToGroupOrchestrated(
  courtNumber,
  selectableCountAtSelection,
  deps
) {
  const {
    // Read values
    isAssigning,
    mobileFlow,
    preselectedCourt,
    operatingHours,
    currentGroup,
    courts,
    currentWaitlistEntryId,
    CONSTANTS,
    // Setters
    setIsAssigning,
    setCurrentWaitlistEntryId,
    setHasWaitlistPriority,
    setCurrentGroup,
    setJustAssignedCourt,
    setAssignedSessionId,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setHasAssignedCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowSuccess,
    setGpsFailedPrompt,
    // Services
    backend,
    // Helpers
    getCourtBlockStatus,
    getMobileGeolocation,
    showAlertMessage,
    validateGroupCompat,
    clearSuccessResetTimer,
    resetForm,
    successResetTimerRef,
    dbg,
    API_CONFIG,
  } = deps;
```

### Destructured Keys Classified

| # | Key | Category | Used For |
|---|-----|----------|----------|
| 1 | isAssigning | state-read | Guard: prevent double-submit |
| 2 | mobileFlow | state-read | Check if mobile flow for preselect |
| 3 | preselectedCourt | state-read | Use preselected court in mobile |
| 4 | operatingHours | state-read | Guard: operating hours check |
| 5 | currentGroup | state-read | Build players array for assignment |
| 6 | courts | state-read | Find court by number for UUID |
| 7 | currentWaitlistEntryId | state-read | Check if waitlist flow |
| 8 | CONSTANTS | state-read | Court count, timeout values |
| 9 | setIsAssigning | setter | Lock/unlock assignment in progress |
| 10 | setCurrentWaitlistEntryId | setter | Clear waitlist entry after assign |
| 11 | setHasWaitlistPriority | setter | Clear waitlist priority |
| 12 | setCurrentGroup | setter | Update group from waitlist result |
| 13 | setJustAssignedCourt | setter | Store assigned court number |
| 14 | setAssignedSessionId | setter | Store session ID for purchases |
| 15 | setReplacedGroup | setter | Store displaced group info |
| 16 | setDisplacement | setter | Store displacement details |
| 17 | setOriginalCourtData | setter | Clear original data |
| 18 | setIsChangingCourt | setter | Clear court change flag |
| 19 | setWasOvertimeCourt | setter | Clear overtime flag |
| 20 | setHasAssignedCourt | setter | Mark group has court |
| 21 | setCanChangeCourt | setter | Enable/disable court change |
| 22 | setChangeTimeRemaining | setter | Set countdown timer |
| 23 | setIsTimeLimited | setter | Mark if time-limited session |
| 24 | setTimeLimitReason | setter | Store time limit reason |
| 25 | setShowSuccess | setter | Show success screen |
| 26 | setGpsFailedPrompt | setter | Show GPS fallback prompt |
| 27 | backend | service | API commands and queries |
| 28 | getCourtBlockStatus | service | Check upcoming blocks |
| 29 | getMobileGeolocation | service | Get mobile GPS coords |
| 30 | showAlertMessage | ui-effect | Display validation alerts |
| 31 | validateGroupCompat | service | Domain validation |
| 32 | clearSuccessResetTimer | service | Clear pending timer |
| 33 | resetForm | service | Full form reset function |
| 34 | successResetTimerRef | state-read | Timer ref for auto-reset |
| 35 | dbg | service | Debug logging utility |
| 36 | API_CONFIG | state-read | Mobile flag check |

### Category Summary
- **State reads:** 9 keys — isAssigning, mobileFlow, preselectedCourt, operatingHours, currentGroup, courts, currentWaitlistEntryId, CONSTANTS, successResetTimerRef, API_CONFIG
- **Setters:** 18 keys — setIsAssigning, setCurrentWaitlistEntryId, setHasWaitlistPriority, setCurrentGroup, setJustAssignedCourt, setAssignedSessionId, setReplacedGroup, setDisplacement, setOriginalCourtData, setIsChangingCourt, setWasOvertimeCourt, setHasAssignedCourt, setCanChangeCourt, setChangeTimeRemaining, setIsTimeLimited, setTimeLimitReason, setShowSuccess, setGpsFailedPrompt
- **Services:** 7 keys — backend, getCourtBlockStatus, getMobileGeolocation, validateGroupCompat, clearSuccessResetTimer, resetForm, dbg
- **UI effects:** 1 key — showAlertMessage

### Call Sites
| File | Line | Context |
|------|------|---------|
| src/registration/appHandlers/handlers/courtHandlers.js | 186 | Inline object literal with 36 keys |

### Test Coverage
| Test File | Approx Test Count | What It Covers |
|-----------|-------------------|----------------|
| tests/unit/orchestration/index.test.js | 1 | Verifies export exists |
| tests/unit/orchestration/helpers/assignCourtValidation.test.js | 22 | Guard helper functions |
| e2e/registration-happy-path.spec.js | (indirect) | Full assignment flow |
| e2e/overtime-takeover.spec.js | (indirect) | Overtime displacement flow |

### Proposed Grouping (Draft)
```javascript
// Target shape after refactor:
{
  state: {
    isAssigning, mobileFlow, preselectedCourt, operatingHours,
    currentGroup, courts, currentWaitlistEntryId,
    successResetTimerRef,
  },
  config: { CONSTANTS, API_CONFIG },
  actions: {
    setIsAssigning,
    setCurrentWaitlistEntryId, setHasWaitlistPriority,
    setCurrentGroup,
    setJustAssignedCourt, setAssignedSessionId,
    setReplacedGroup, setDisplacement, setOriginalCourtData,
    setIsChangingCourt, setWasOvertimeCourt, setHasAssignedCourt,
    setCanChangeCourt, setChangeTimeRemaining,
    setIsTimeLimited, setTimeLimitReason,
    setShowSuccess, setGpsFailedPrompt,
  },
  services: {
    backend,
    getCourtBlockStatus, getMobileGeolocation,
    validateGroupCompat,
    clearSuccessResetTimer, resetForm,
    dbg,
  },
  ui: { showAlertMessage },
}
```

---

## Refactor Sequence

1. **Commit 0** (this doc): Inventory and targets locked
2. **Commits 1–3**: Reset orchestrator (snapshot → context creator → narrow interface)
3. **Commits 4–5**: Member selection (snapshot+context → narrow) — may skip if already ≤18
4. **Commits 6–7**: Assign court (snapshot+context → narrow)
5. **Commit 8**: Final parity evidence and regression proof

## Operating Rules
- One orchestrator per sub-package — no batch refactor
- No behavior changes: no sequencing, branching, retry, or timeout changes
- No public interface changes until parity evidence exists
- Snapshot first, refactor second
- npm run verify green at every commit
- Playwright 15/15 at end of each sub-package

## Out of Scope
- `useRegistrationHandlers.js` mega-surface (94 props) — separate staged effort
- `waitlistOrchestrator.js` (already ≤12)
- `courtChangeOrchestrator.js` (already ≤8)
- Business logic, UI, or formatting changes

---

## Reset Orchestrator — Pre-Refactor Invariants

### Locked Invariants (must be preserved through refactor)

**Signature:** `resetFormOrchestrated(deps)` — single deps object parameter

**Call site:** `useRegistrationHandlers.js` (line 144)

**Call-site deps assembly:**
```javascript
  // Reset form (moved to orchestration layer - WP5.5)
  const resetForm = useCallback(() => {
    resetFormOrchestrated({
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setAssignedSessionId,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setIsTimeLimited,
      setCurrentScreen,
      setSearchInput,
      setShowSuggestions,
      setShowAddPlayer,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setSelectedCourtToClear,
      setClearCourtStep,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setCourtToMove,
      setHasAssignedCourt,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setShowGuestNameError,
      setShowSponsorError,
      setRegistrantStreak,
      setShowStreakModal,
      setStreakAcknowledged,
      clearCache,
      clearSuccessResetTimer,
    });
  }, [/* 36 dependencies */]);
```

### Setter/Service Call Sequence (in order, from reading the function body)

The following calls are made in this exact order. No reordering is allowed during refactor.
```
 1. clearSuccessResetTimer()
 2. setCurrentGroup([])
 3. setShowSuccess(false)
 4. setMemberNumber('')
 5. setCurrentMemberId(null)
 6. setJustAssignedCourt(null)
 7. setAssignedSessionId(null)
 8. setReplacedGroup(null)
 9. setDisplacement(null)
10. setOriginalCourtData(null)
11. setCanChangeCourt(false)
12. setIsTimeLimited(false)
13. setCurrentScreen('home', 'resetForm')
14. setSearchInput('')
15. setShowSuggestions(false)
16. setShowAddPlayer(false)
17. setAddPlayerSearch('')
18. setShowAddPlayerSuggestions(false)
19. setHasWaitlistPriority(false)
20. setCurrentWaitlistEntryId(null)
21. setWaitlistPosition(0)
22. setSelectedCourtToClear(null)
23. setClearCourtStep(1)
24. setIsChangingCourt(false)
25. setWasOvertimeCourt(false)
26. setCourtToMove(null)
27. setHasAssignedCourt(false)
28. clearCache()
29. setShowGuestForm(false)
30. setGuestName('')
31. setGuestSponsor('')
32. setShowGuestNameError(false)
33. setShowSponsorError(false)
34. setRegistrantStreak(0)
35. setShowStreakModal(false)
36. setStreakAcknowledged(false)
```

Total setter calls: 34
Total service calls: 2 (clearSuccessResetTimer at position 1, clearCache at position 28)

### Constraints
- **No ordering changes allowed.** The call sequence above is the contract.
- **No value changes.** Each setter receives the same reset value as currently coded.
- **No control flow changes.** There are no conditionals in resetFormOrchestrated — pure sequential calls.
