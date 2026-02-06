# Error Handling

## Overview

This document describes error handling patterns across the application.

## Error Propagation Flow

```text
Commands (Zod validate → throw Error)
    ↓
ApiAdapter (fetch → check .ok → throw AppError)
    ↓
Services (catch/rethrow or check .ok)
    ↓
Orchestrators (guard returns + try/catch → toast/alert)
    ↓
UI (useState error state, toast, showAlertMessage)
```

## Layer-by-Layer Contracts

### Commands

**Pattern:** Validate input with Zod, throw on failure.

Commands are pure validation gates — they do not catch errors.

### ApiAdapter

**Pattern:** Fetch, check response, throw `AppError` on failure.

Throw sites:

| Condition | Category | Code | Details |
|-----------|----------|------|---------|
| `!data.ok` (API returned error) | `NETWORK` | `API_ERROR` | response data |
| fetch/network failure | `NETWORK` | `FETCH_FAILED` | original error |

Already-wrapped `AppError` instances pass through without re-wrapping.

### Services

**Pattern:** Mixed throw and return-based.

Some services re-throw errors from ApiAdapter (which are `AppError` instances). Others catch and return `{ ok, error }` envelopes.

The consistent envelope shape is: `{ ok: boolean, message?, error?, data? }`

### Orchestrators

**Pattern:** Guards + try/catch + UI feedback.

Orchestrators use a guard pattern for validation and wrap backend operations in try/catch blocks. All bare `return;` statements are annotated with one of three categories (see Silent Return Inventory below).

### UI

**Pattern:** `useState` + `Tennis.UI.toast()` + `showAlertMessage()`.

Components typically read `.message` from caught errors for display.

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

Error handling contracts are locked by 24 tests in `tests/unit/errors/`:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `AppError.test.js` | 10 | instanceof, message, category, code, details, stack tolerance |
| `resultTypes.test.js` | 6 | okResult/errResult shapes |
| `resultNormalizerShapes.test.js` | 8 | success/failure/wrapAsync conformance |

## Future Work

- Service layer contract unification (standardize throw vs return)
- React error boundaries
- Error telemetry / centralized logging
- UI error handling standardization that uses AppError metadata
- HTTP status code → ErrorCategory mapping (where available)
