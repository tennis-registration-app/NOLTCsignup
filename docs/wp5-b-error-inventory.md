# WP5-B Error Inventory

Generated: 2026-02-05

## Summary Counts

| Location | throw sites | return-error sites | catch blocks |
|----------|-------------|-------------------|--------------|
| services/ | 14 | 1 | 6 |
| services/modules/ | 14 | 0 | 6 |
| services/legacy/ | 0 | 0 | 0 |

Note: services/ count includes modules/ (all throws are in modules/).

## Throw Patterns by Module

| File | Function | Line | Pattern | Message String | UI Risk |
|------|----------|------|---------|----------------|---------|
| courtsService.js | refreshCourtData | 37 | `throw error` | (rethrow) | LOW |
| courtsService.js | getCourtByNumber | 65 | `throw new Error(...)` | `Court ${courtNumber} not found` | LOW |
| courtsService.js | assignCourt | 130 | `throw new Error(...)` | `Invalid players format` | LOW |
| courtsService.js | assignCourt | 141 | `throw new Error(...)` | `Court ${courtNumber} not found` | LOW |
| waitlistService.js | refreshWaitlist | 38 | `throw error` | (rethrow) | LOW |
| waitlistService.js | removeFromWaitlist | 55 | `throw new Error(...)` | `Waitlist entry at index ${waitlistId} not found` | LOW |
| waitlistService.js | addToWaitlist | 116 | `throw error` | (rethrow) | LOW |
| waitlistService.js | assignFromWaitlist | 126 | `throw new Error(...)` | `Waitlist entry at index ${waitlistId} not found` | LOW |
| waitlistService.js | assignFromWaitlist | 136 | `throw new Error(...)` | `Court ${courtNumber} not found` | LOW |
| lifecycleService.js | loadInitialData | 52 | `throw error` | (rethrow) | LOW |
| participantResolution.js | resolvePlayers | 155 | `throw new Error(...)` | `Could not match "${player.name}" to any member...` | CHECK |
| participantResolution.js | resolvePlayers | 173 | `throw e` | (rethrow) | LOW |
| participantResolution.js | resolvePlayers | 228 | `throw new Error(...)` | `profile.finalErrorMessage(player)` (dynamic) | CHECK |
| participantResolution.js | resolveParticipants | 267 | `throw new Error(...)` | `profile.finalErrorMessage(missingAccountId)` (dynamic) | CHECK |

## Return-Based Error Patterns

| File | Function | Line | Pattern |
|------|----------|------|---------|
| GeolocationService.js | getCurrentPosition | 71 | `{ success: false, error: ... }` |

Note: GeolocationService is outside scope (not in modules/).

## UI Message Dependencies (MUST PRESERVE)

| UI File | Line | Pattern | Depends On |
|---------|------|---------|------------|
| QRScanner.jsx | 58 | `err.message?.includes('Permission')` | Browser error (not service) |
| QRScanner.jsx | 61 | `err.message?.includes('NotFoundError')` | Browser error (not service) |
| ApiTestPanel.jsx | 50,60,70 | `${err.message}` | Display only |
| useAnalyticsQuery.js | 43 | `err.message` | Display only |
| LocationQRCode.jsx | 60 | `err.message` | Display only |
| UsageComparisonChart.jsx | 55 | `error.message` | Display only |
| waitlistOperations.js | 31 | `error.message \|\| 'fallback'` | Display with fallback |
| courtOperations.js | 46,90,91,138 | `error.message \|\| 'fallback'` | Display with fallback |
| useWetCourts.js | 60,93,153,186 | `error.message` | Stored in state |
| CourtStatusGrid.jsx | 385 | `error.message \|\| 'fallback'` | Display with fallback |
| SystemSettings.jsx | 245 | `err.message \|\| 'fallback'` | Display with fallback |
| App.jsx | 598 | `error.message` | Display only |
| GameHistorySearch.jsx | 85 | `err.message` | Display only |
| AIAssistant.jsx | 76,77,163,164 | `err.message` | Display only |
| CompleteBlockManagerEnhanced.jsx | 428 | `error.message` | Alert |
| EventDetailsModal.jsx | 153,187,219 | `err.message \|\| 'fallback'` | Display with fallback |
| useBlockHandlers.js | 83 | `error.message` | Alert |

**Key finding**: All UI usages are either:
1. Display-only (show message to user)
2. Display with fallback (`error.message || 'Fallback text'`)
3. Browser errors (not from our services)

**No string comparisons** (`===`, `.includes()`, `.match()`) on service error messages found.

## Shared Error Helpers Found

None found. Error messages are accessed directly via `.message`.

## instanceof Checks Found

| File | Line | Pattern | Risk Level |
|------|------|---------|------------|
| src/lib/errors/AppError.js | 25 | `instanceof AppError` | LOW (comment/example) |
| src/lib/ApiAdapter.js | 66 | `instanceof AppError` | **MEDIUM** - rethrows AppError |

**Analysis**: ApiAdapter uses `instanceof AppError` to preserve AppError instances when rethrowing.
If we wrap service errors in a new type, this check will continue to work as long as the new type
is also an AppError subclass or we adjust the check.

## Custom Error Types Found

| File | Class | Usage |
|------|-------|-------|
| src/lib/errors/AppError.js | `AppError` | Used by ApiAdapter for API/network errors |

AppError has:
- `category` (ErrorCategory)
- `code` (string)
- `message` (inherited from Error)
- `details` (any)

## Normalization Priority Order

1. **participantResolution.js** - 4 throw sites, 2 catch blocks, dynamic messages (CHECK)
2. **courtsService.js** - 4 throw sites, 1 catch block, template strings (LOW)
3. **waitlistService.js** - 5 throw sites, 2 catch blocks, template strings (LOW)
4. **lifecycleService.js** - 1 throw site (rethrow only), 1 catch block (LOW)

## Messages That MUST Be Preserved

Based on UI analysis, **no specific message strings need preservation**. All UI code uses:
- Direct display: `${err.message}`
- Fallback display: `err.message || 'Default message'`

No code does string comparisons or pattern matching on service error messages.

## Profile-Based Error Messages (participantResolution.js)

The participantResolution module uses a profile pattern with `finalErrorMessage` functions:

```javascript
// courtsProfile
finalErrorMessage: (p) => `Could not find account for player: ${p.name || p.displayName || 'Unknown'}`

// waitlistProfile
finalErrorMessage: (p) => `Could not resolve member: ${JSON.stringify(p)}`
```

These are generated dynamically and displayed to users. No specific string matching found.

## Follow-On Notes

1. **AppError integration**: Consider having service modules throw AppError instead of plain Error
   for consistency with ApiAdapter's error contract.

2. **No blocking issues**: No `instanceof` checks on service errors that would break with wrapping.
   The only `instanceof AppError` is in ApiAdapter which we're not touching.

3. **Rethrow pattern**: 5 of 14 throw sites are `throw error` or `throw e` (rethrows).
   These preserve whatever error type was caught.

4. **Profile pattern**: participantResolution uses configurable error behavior via profiles.
   This is already a good separation of concerns.

5. **Error logging**: All catch blocks log before rethrowing, which is good for debugging.
