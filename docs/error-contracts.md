# Service Error Contract

## 1. Purpose

The service layer normalizes all errors to a predictable, UI-safe shape. This ensures:

- Backend-authoritative services handle error classification
- UIs receive consistent error objects without guessing error types
- Sensitive details (stack traces, internal messages) are separated from safe metadata
- Error handling code is centralized rather than scattered across consumers

## 2. DomainError Shape

```javascript
{
  name: 'DomainError',
  code: ErrorCodes,        // One of the defined error codes
  message: string,         // Preserved from original error by default
  safeDetails: {           // Sanitized metadata safe for logging/display
    service: string,       // e.g., 'courtsService'
    operation: string,     // e.g., 'assignCourt'
  },
  cause: Error,            // Original error object (NOT for UI display)
}
```

## 3. Error Codes

Current minimal set defined in `src/lib/errors.js`:

| Code | Description |
|------|-------------|
| `UNKNOWN` | Default fallback for unclassified errors |
| `NETWORK` | Network/fetch failures |
| `DB_ERROR` | Database operation failures |
| `EDGE_FN_ERROR` | Supabase edge function errors |
| `TRANSFORM_ERROR` | Data transformation failures (available; optional future usage) |

## 4. Normalization Rules

1. **Idempotent**: If a `DomainError` is passed in, the same instance is returned unchanged
2. **Preserve message**: Original error message is kept by default
3. **Attach safeDetails**: Service name and operation are always included
4. **Attach cause**: Original error is preserved for debugging (never display to users)
5. **codeOverride behavior**: Respected only if it's a valid `ErrorCodes` value; otherwise ignored and automatic detection applies

## 5. Where Normalization Happens

### Facade Layer

**ApiTennisService** (`src/registration/services/ApiTennisService.js`):
- 13 public async methods wrapped at boundary

### Service Modules

| Module | Methods Normalized |
|--------|-------------------|
| `courtsService` | 6 (`refreshCourtData`, `getAllCourts`, `getAvailableCourts`, `getCourtByNumber`, `clearCourt`, `assignCourt`) |
| `waitlistService` | 5 (`refreshWaitlist`, `getWaitlist`, `removeFromWaitlist`, `addToWaitlist`, `assignFromWaitlist`) |
| `membersService` | 3 (`searchMembers`, `getMembersByAccount`, `getAllMembers`) |
| `settingsService` | 2 (`getSettings`, `refreshSettings`) |
| `purchasesService` | 1 (`purchaseBalls`) |
| `lifecycleService` | 1 (`loadInitialData`) |
| `participantResolution` | 1 (`resolveParticipants`) |

**Totals**: 19 module methods/functions normalized across 7 service modules

## 6. Usage Examples

### Import

```javascript
import { normalizeServiceError, DomainError, isDomainError } from '@lib/errors';
```

### Service Boundary Pattern

```javascript
export async function addToWaitlist(players, options = {}) {
  try {
    // existing logic
  } catch (e) {
    throw normalizeServiceError(e, { service: 'waitlistService', op: 'addToWaitlist' });
  }
}
```

### UI Consumption

```javascript
try {
  await apiService.addToWaitlist(players);
} catch (err) {
  // Safe to display
  showError(err.message || 'An error occurred');

  // Safe to log
  logger.error('Waitlist error', {
    code: err.code,
    details: err.safeDetails,
  });

  // Never display to users
  // err.cause contains original error with stack trace
}
```

## 7. Non-Goals / Follow-Ons

- **TRANSFORM_ERROR**: Apply at transform call sites (deferred)
- **Finer domain codes**: Map specific Supabase error codes to more granular domain codes
- **UI error component**: Standardize error presentation pattern across the application
