# Legacy Field Migration Checklist

## Overview

The normalize layer now returns pure Domain objects. Legacy components use `toLegacyBoard()`
as a temporary bridge. This document tracks migration progress.

## Migration Status

### High Priority (App.jsx)
- [ ] Replace `court.current` with `court.session`
- [ ] Replace `court.isUnoccupied` with `court.isAvailable`
- [ ] Replace `participants` with `group.players`
- [ ] Replace `court.players` with `court.session.group.players`

### Files to Migrate

| File | Usages | Status |
|------|--------|--------|
| src/registration/App.jsx | 20+ | ⬜ Not started |
| src/registration/services/ApiTennisService.js | 10+ | ⬜ Not started |
| src/courtboard/main.jsx | 5+ | ⬜ Not started |
| src/registration/screens/ClearCourtScreen.jsx | 3+ | ⬜ Not started |
| src/registration/screens/SuccessScreen.jsx | 2+ | ⬜ Not started |
| src/registration/backend/wire.js | 2 | ⬜ Not started |
| src/admin/screens/GameHistorySearch.jsx | 1 | ⬜ Not started |
| src/courtboard/mobile-bridge.js | 2 | ⬜ Not started |
| src/courtboard/mobile-fallback-bar.js | 1 | ⬜ Not started |

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
