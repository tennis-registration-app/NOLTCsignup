# Error Handling

## Overview

This document describes error handling patterns across the application.

## Error Propagation Flow (Taxonomy Chain)

```text
Backend API
    ↓  { ok: false, code: 'COURT_OCCUPIED', message: '...' }
TennisCommands / TennisQueries
    ↓  throw AppError({ category: mapResponseToCategory(code), code, message })
ApiAdapter._fetch()
    ↓  throw AppError({ category: NETWORK, code: FETCH_FAILED }) on transport error
    ↓  (AppError from Commands/Queries passes through unwrapped)
Orchestrators
    ↓  catch → normalizeError(err) → { category, code, message, isAppError }
    ↓  Structured metadata logged; user-facing message unchanged
UI (toast / showAlertMessage / showNotification)
```

**Key invariant:** An `AppError` thrown at any layer arrives in the orchestrator
catch block with its `category` and `code` intact. `normalizeError()` extracts
these fields without altering the user-facing message.

## Layer-by-Layer Contracts

### TennisCommands

**Pattern:** Validate input with Zod, call ApiAdapter, throw `AppError` on failure.

Commands validate input, then delegate to ApiAdapter. Four throw sites use
`AppError` with explicit categories:

| Throw site | Category | Code |
|------------|----------|------|
| Missing member lookup | `NOT_FOUND` | `MEMBER_NOT_FOUND` |
| Missing account on member | `VALIDATION` | `MISSING_ACCOUNT` |
| Invalid participants array | `VALIDATION` | `INVALID_PARTICIPANTS` |
| Waitlist entry not found | `NOT_FOUND` | `WAITLIST_ENTRY_NOT_FOUND` |

### TennisQueries

**Pattern:** Call ApiAdapter, throw `AppError` with mapped category on failure.

Uses `mapResponseToCategory(response.code)` to deterministically classify
backend denial codes into ErrorCategories. This is the single source of truth
for code-to-category mapping.

### ApiAdapter

**Pattern:** Fetch, check response, throw `AppError` on failure.

Throw sites:

| Condition | Category | Code | Details |
|-----------|----------|------|---------|
| `!data.ok` (API returned error) | `NETWORK` | `API_ERROR` | response data |
| fetch/network failure | `NETWORK` | `FETCH_FAILED` | original error |

Already-wrapped `AppError` instances pass through without re-wrapping.

### Orchestrators

**Pattern:** Guards + try/catch + `normalizeError()` + UI feedback.

Orchestrators use a guard pattern for validation and wrap backend operations in
try/catch blocks. Catch blocks call `normalizeError(err)` to extract structured
metadata (`category`, `code`, `message`, `isAppError`) for logging. User-facing
messages remain unchanged. All bare `return;` statements are annotated with one
of three categories (see Silent Return Inventory below).

### Admin Handlers

**Pattern:** Context-injected `showNotification()` for all user feedback.

All three operations (`clearCourtOp`, `moveCourtOp`, `clearAllCourtsOp`) use
`ctx.showNotification(message, type)` consistently. No module-level `toast()`
imports.

### UI

**Pattern:** `useState` + `toast()` + `showAlertMessage()` (registration) /
`showNotification()` (admin).

Components read `.message` from caught errors for display. Structured metadata
(`category`, `code`) is available in logs but not yet used for category-aware UX
decisions (deferred to WP-5B).

## AppError Class

**Location:** `src/lib/errors/AppError.js`

Example:
```javascript
import { AppError, ErrorCategories } from './errors/index.js';

throw new AppError({
  category: ErrorCategories.NETWORK,
  code: 'API_ERROR',
  message: 'API request failed',
  details: { endpoint: '/api/courts' },
});
```

Properties:

| Property | Type | Description |
|----------|------|-------------|
| `category` | `ErrorCategory` | machine-readable classification |
| `code` | `string` | specific error code |
| `message` | `string` | human-readable message (inherited from Error) |
| `details` | `any` | optional context |
| `name` | `string` | always `'AppError'` |

Implementation details:

- Extends `Error` (backwards compatible with existing `catch` blocks)
- `Object.setPrototypeOf(this, AppError.prototype)` preserves `instanceof AppError`
- `Error.captureStackTrace?.(this, AppError)` for clean V8 stack traces
- All fields assigned once in constructor (stable, not mutated)

## Error Categories

**Location:** `src/lib/errors/errorCategories.js`

| Category | Description | Typical sources |
|----------|-------------|-----------------|
| `VALIDATION` | input validation failures | bad data, schema errors |
| `NETWORK` | network/transport failures | fetch errors, timeouts, 5xx |
| `AUTH` | authentication/authorization | 401, 403 |
| `CONFLICT` | resource conflicts | 409, concurrent modification |
| `NOT_FOUND` | resource not found | 404 |
| `UNKNOWN` | unclassifiable errors | unexpected failures |

`ErrorCategories` is frozen — changes require an explicit code change.

## DenialCodes → ErrorCategory Mapping

**Location:** `src/lib/errors/mapResponseToCategory.js`

Backend denial codes are mapped to ErrorCategories via a single deterministic
function. All 14 DenialCodes are covered:

| Category | DenialCodes |
|----------|-------------|
| `CONFLICT` | `COURT_OCCUPIED`, `COURT_BLOCKED`, `MEMBER_ALREADY_PLAYING`, `MEMBER_ON_WAITLIST`, `SESSION_ALREADY_ENDED` |
| `VALIDATION` | `OUTSIDE_OPERATING_HOURS`, `OUTSIDE_GEOFENCE`, `INVALID_MEMBER`, `INVALID_REQUEST` |
| `NOT_FOUND` | `COURT_NOT_FOUND`, `WAITLIST_ENTRY_NOT_FOUND`, `SESSION_NOT_FOUND` |
| `UNKNOWN` | `QUERY_ERROR`, `INTERNAL_ERROR` |

Code comparisons use the `DenialCodes` enum (`src/lib/backend/types.js`) — no
raw string literals.

## normalizeError

**Location:** `src/lib/errors/normalizeError.js`

Extracts structured metadata from any caught value:

| Input type | `category` | `code` | `isAppError` |
|------------|-----------|--------|--------------|
| `AppError` | preserved | preserved | `true` |
| `Error` | `UNKNOWN` | `null` | `false` |
| other | `UNKNOWN` | `null` | `false` |

Used in orchestrator catch blocks for structured logging without altering
user-facing messages.

## Result Types

**Location:** `src/lib/types/result.js`

These formalize the existing `{ ok, data }` / `{ ok, error }` envelope pattern:

```javascript
import { okResult, errResult } from '../lib/types/result.js';

// Success
const a = okResult({ courts: [1, 2, 3] });
// → { ok: true, data: { courts: [1, 2, 3] } }

// Failure
const b = errResult({ code: 'NOT_FOUND', message: 'Court not found' });
// → { ok: false, error: { code: 'NOT_FOUND', message: 'Court not found', details?: ... } }
```

The orchestrator helpers in `src/registration/orchestration/helpers/resultNormalizer.js`
(`success`, `failure`, `wrapAsync`) produce the same shapes and are typed against these definitions.

## UI Feedback Decision Table

| Scenario | Method | Type |
|----------|--------|------|
| Validation guard failure | `Tennis.UI.toast()` | warning/error |
| User-actionable blocking error | `showAlertMessage()` | modal |
| Race condition | `Tennis.UI.toast()` | warning |
| API/network failure | `Tennis.UI.toast()` | error |
| Double-submit prevention | silent `return;` | none |

## Silent Return Inventory

All bare `return;` statements in orchestrators are annotated with one of:

| Annotation | Meaning | Count |
|------------|---------|-------|
| `SILENT-GUARD` | no feedback needed (e.g., double-submit prevention) | 2 |
| `FEEDBACK` | toast/alert fires before the return | 27 |
| `EARLY-EXIT` | defensive check, no action required | 3 |

Total: 32 annotated returns across 3 orchestrator files.

## Test Coverage

Error handling contracts are locked by tests in `tests/unit/errors/`:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `AppError.test.js` | 10 | instanceof, message, category, code, details, stack tolerance |
| `resultTypes.test.js` | 6 | okResult/errResult shapes |
| `resultNormalizerShapes.test.js` | 8 | success/failure/wrapAsync conformance |
| `mapResponseToCategory.test.js` | 19 | all 14 DenialCodes + edge cases + exhaustiveness |
| `normalizeError.test.js` | 9 | AppError/Error/string/number/null/undefined + instanceof chain |
| `taxonomyChain.contract.test.js` | — | end-to-end chain: DenialCode → AppError → normalizeError |

## resultNormalizer (Available Helper)

**Location:** `src/registration/orchestration/helpers/resultNormalizer.ts`

Provides typed utilities for standardizing success/failure envelopes:

- `Result<T>` / `ResultError` / `ResultOrError<T>` — discriminated union types
- `success(data)` — create `{ ok: true, data }` envelope
- `failure(code, message, details?)` — create `{ ok: false, error: { code, message, details } }` envelope
- `wrapAsync(fn)` — wrap an async function, catching errors into `ResultError` with code `UNEXPECTED_ERROR`

**Status:** Available but currently unused in production. Tested by 8 conformance
tests in `resultNormalizerShapes.test.js`. Available for adoption by orchestrators
during error taxonomy unification. Adoption decision will be made after
TennisCommands/TennisQueries error preservation work (WP-ERROR-TAXONOMY-CHAIN).

## Future Work

- Category-aware UX decisions: retry for NETWORK, inline for VALIDATION (WP-5B)
- Registration notification unification: toast vs showAlertMessage channel split
- Fire-and-forget error cleanup in non-critical paths
- React error boundaries
- Error telemetry / centralized logging
