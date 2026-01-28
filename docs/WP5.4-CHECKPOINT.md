# WP5.4 Checkpoint: Court/Assignment Stabilization

**Date:** January 28, 2026
**Status:** ✅ Complete (R9a-1, R9a-2)
**Stop Line:** 🔒 Active — No further extraction until orchestration containment defined

---

## Summary

### What's Done

| Work Package | Cluster | State Vars | Commits |
|--------------|---------|------------|---------|
| WP5.3 | R3 Block/Admin | 7 | ✅ |
| WP5.3 | R4a Admin Waitlist | 1 | ✅ |
| WP5.3 | R5a Member/Search | 6 | ✅ |
| WP5.3 | R8a Group/Guest | 6 | ✅ |
| WP5.3 | R8c Streak | 3 | ✅ |
| WP5.3 | R8b Member Identity | 4 | ✅ |
| WP5.4 | R9a-1 Court Assignment Result | 3 | ✅ |
| WP5.4 | R9a-2 Clear Court Flow | 2 | ✅ |
| **Total** | | **32/73 (44%)** | |

### Pattern Proven

Every extraction followed this pattern with zero regressions:
1. Inventory (evidence-first)
2. Reducer + Hook + Unit Tests (no App.jsx changes)
3. Integration (remove useState, wire hook, preserve behavior)
4. Playwright gate (15/15)

### Files Created

| Directory | Files | Purpose |
|-----------|-------|---------|
| src/registration/blocks/ | 2 | Block admin state |
| src/registration/waitlist/ | 2 | Waitlist admin state |
| src/registration/search/ | 2 | Member search + debounce |
| src/registration/group/ | 2 | Group/guest state |
| src/registration/streak/ | 2 | Streak warning state |
| src/registration/memberIdentity/ | 2 | Member identity + frequent partners |
| src/registration/court/ | 4 | Court assignment result + clear flow |
| tests/unit/registration/*/ | 7 | Reducer unit tests |

### Test Coverage

- **Reducer unit tests:** 75+
- **Total unit tests:** 227
- **Playwright E2E:** 15/15

---

## Stop Line 🔒

**No further court/move/change-court extraction until orchestration containment is defined.**

Explicitly blocked:
- R9a-3 (preselectedCourt, isChangingCourt, courtToMove)
- R9b (selectors) — deferred, Tennis.Domain.* already exists
- R9c (assignment orchestrators)

---

## Remaining Inventory by Coupling Level

### Low Coupling (Safe Future Extractions)

| Cluster | State Vars | Notes |
|---------|------------|-------|
| Alert/Modal flags | ~5 | showAlert, alertMessage, showConfirmModal, etc. |
| Success screen state | ~3 | Already partially extracted |

### Medium Coupling (Needs Interface Decisions)

| Cluster | State Vars | Notes |
|---------|------------|-------|
| R6 UI/Flow | ~14 | currentScreen, mobileFlow — navigation coupling |
| Misc/Config | ~10 | operatingHours, ballPrice — config vs state |

### High Coupling (Orchestrators + Navigation)

| Cluster | State Vars | Notes |
|---------|------------|-------|
| R9a-3 Court Change | 3 | preselectedCourt, isChangingCourt, courtToMove |
| R4b User Waitlist Join | 2 | 155-line sendGroupToWaitlist handler |
| R4c Waitlist CTA | 2 | hasWaitlistPriority, currentWaitlistEntryId |
| Selection Orchestrators | — | handleSuggestionClick, handleAddPlayerSuggestionClick |

### Frozen Orchestrators (Do Not Refactor Without Strategy)

- `assignCourtToGroup` (~370 lines)
- `sendGroupToWaitlist` (~155 lines)
- `changeCourt` (~50 lines)
- `handleSuggestionClick` (~130 lines)
- `handleAddPlayerSuggestionClick` (~115 lines)

---

## Next Steps

1. Complete ORCHESTRATION.md (containment strategy)
2. Complete ARCHITECTURE_MAP.md (contractor discoverability)
3. Overseer approval to reopen extraction work
4. Likely next: R6 (UI/Flow) with navigation coupling addressed
