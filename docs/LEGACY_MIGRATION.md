# Legacy Field Migration Checklist

## Overview

The normalize layer now returns pure Domain objects. Legacy components use `toLegacyBoard()`
as a temporary bridge. This document tracks migration progress.

## Migration Status

> **Current state:** All files below are bridged via `toLegacyBoard()` — the system works correctly
> with legacy field names in these components. Direct field-name migration is deferred.
> See `docs/review-remediation.md` "Retained Technical Debt" for rationale.

### High Priority (App.tsx)
- 🔀 Replace `court.current` with `court.session` — Bridged (toLegacyBoard) — full removal deferred
- 🔀 Replace `court.isUnoccupied` with `court.isAvailable` — Bridged (toLegacyBoard) — full removal deferred
- 🔀 Replace `participants` with `group.players` — Bridged (toLegacyBoard) — full removal deferred
- 🔀 Replace `court.players` with `court.session.group.players` — Bridged (toLegacyBoard) — full removal deferred

### Files to Migrate

| File | Usages | Status |
|------|--------|--------|
| src/registration/App.tsx | 20+ | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/registration/services/ApiTennisService.js | 10+ | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/courtboard/main.jsx | 5+ | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/registration/screens/ClearCourtScreen.tsx | 3+ | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/registration/screens/SuccessScreen.tsx | 2+ | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/registration/backend/wire.js | 2 | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/admin/screens/GameHistorySearch.jsx | 1 | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/courtboard/mobile-bridge.js | 2 | 🔀 Bridged (toLegacyBoard) — full removal deferred |
| src/courtboard/mobile-fallback-bar.js | 1 | 🔀 Bridged (toLegacyBoard) — full removal deferred |

### Field Mappings

| Legacy Field | Domain Field | Notes |
|--------------|--------------|-------|
| `court.current` | `court.session` | Contains group, timing |
| `court.current.players` | `court.session.group.players` | Array of Member |
| `court.isUnoccupied` | `court.isAvailable` | `!isOccupied && !isBlocked` |
| `court.isActive` | `court.isOccupied` | Has active session |
| `court.players` | `court.session.group.players` | Top-level array |
| `participants` | `group.players` | On session or waitlist entry |
| `groupType` | `group.type` | 'singles' | 'doubles' | 'foursome' |
| `minutesRemaining` | Compute | `Math.floor((scheduledEndAt - serverNow) / 60000)` |
| `waitingGroups` | `waitlist` | Array of WaitlistEntry |
| `entry.names` | `entry.group.players.map(p => p.displayName)` | Derived |

### How to Migrate a File

1. Import toLegacyBoard at the UI entry point only (not in every file)
2. Replace legacy field access with Domain field access
3. For derived fields like `minutesRemaining`, compute from Domain fields
4. Run `npm run lint` to check for errors
5. Test the affected flows manually
6. Check console for legacy warnings
7. Update this checklist

### Entry Point Pattern

```javascript
// At the UI entry point (App.jsx or main.jsx)
import { toLegacyBoard } from '@lib/api/legacyAdapter.js';

// In subscription callback:
const domainBoard = board; // From TennisQueries
const legacyBoard = toLegacyBoard(domainBoard, domainBoard._raw);
// Pass legacyBoard to unmigrated components
// Pass domainBoard to migrated components
```

### Verification

After migrating each file:
1. Run `npm run lint`
2. Test affected flows manually
3. Check console for legacy warnings
4. Update this checklist

### Completion Criteria

- [ ] All files migrated
- [ ] `toLegacyBoard()` deleted from legacyAdapter.js
- [ ] No legacy warnings in console
- [ ] All tests pass
- [ ] `_raw` property removed from board

## Progress Log

| Date | File | Changes | Verified |
|------|------|---------|----------|
| 2025-12-27 | TennisQueries.js | Returns pure Domain | ✅ |
| 2025-12-27 | legacyAdapter.js | Created toLegacyBoard() | ✅ |
