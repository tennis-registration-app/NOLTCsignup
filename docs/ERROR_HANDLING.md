# Error Handling

## Overview

This document describes the error handling patterns across the application, the target error contract established in WP-HR8, and the guidelines for error propagation between layers.

WP-HR8 is a **consistency and contract normalization** phase. It standardizes error metadata and documents existing patterns without changing runtime behavior or error propagation contracts.

## Current Error Patterns by Layer

### Commands Layer

**Pattern:** Validate + throw (consistent)

All 11 command files use Zod schema validation. Invalid input throws immediately with a formatted error message:
```javascript
throw new Error(`Invalid AssignCourtCommand: ${errors}`);
```

Commands do not catch errors — they are pure validation gates. **No changes needed in HR8.**

### API Adapter Layer

**Pattern:** Fetch + check response + throw

The API adapter checks `response.ok` and throws on failure:
```javascript
if (!data.ok) {
  throw new Error(data.error || 'API request failed');
}
```

**HR8 change:** Replace `throw new Error(...)` with `throw new AppError(...)` to add category and code metadata. This is backwards compatible — callers catching `Error` still work because `AppError extends Error`.

### Service Layer

**Pattern:** Mixed throw + return-based

Services use a combination of patterns: some re-throw errors from the API adapter, others catch and return `{ ok, error }` envelopes. This variance is **documented but not changed in HR8** — service contract unification is deferred to a future work package.

The consistent API envelope shape is: `{ ok: boolean, message?, error?, data? }`

### Orchestrator Layer

**Pattern:** Guards + try/catch + UI feedback

Orchestrators use the WP-HR4 guard pattern for validation:
```javascript
const check = guardOperatingHours({ settings, currentHour, currentMinute, dayOfWeek });
if (!check.ok) {
  if (check.ui?.action === 'toast') Tennis.UI.toast(...check.ui.args);
  if (check.ui?.action === 'alert') showAlertMessage(...check.ui.args);
  return;
}
```

Backend operations are wrapped in try/catch blocks that provide UI feedback on failure. **Guard patterns are preserved exactly as established in WP-HR4.**

### UI Layer

**Pattern:** useState + toast + showAlertMessage

Components use `useState` for error state, `Tennis.UI.toast()` for transient feedback, and `showAlertMessage()` for blocking modals. **No changes in HR8.**

## UI Feedback Decision Table

This documents the **current** behavior (what is, not what should be):

| Scenario | Method | Type | Example |
|----------|--------|------|---------|
| Validation guard failure (hours, court) | `Tennis.UI.toast()` | warning | "The club is not open yet" |
| User-actionable error (no players) | `showAlertMessage()` | modal | "Please select players first" |
| Race condition (court taken) | `Tennis.UI.toast()` | warning | "Court was just assigned" |
| API/network failure | `Tennis.UI.toast()` | error | "Failed to assign court" |
| Group compatibility issue | `showAlertMessage()` | modal | Compatibility warning |
| Double-submit prevention | Silent `return` | none | Intentional — no feedback needed |

## Silent Return Inventory

Orchestrators contain early `return;` statements (34 total). These fall into two categories:

1. **Intentional silent** — No feedback needed (e.g., double-submit guard where `isAssigning` is true)
2. **Preceded by UI feedback** — Toast or alert fires before the return

A complete annotation of each silent return is tracked in Commit 5 of WP-HR8.

## HR8 Target Contract

### What HR8 Changes

| Change | Layer | Description |
|--------|-------|-------------|
| `AppError` class | New (`src/lib/errors/`) | Typed error with `category`, `code`, `message`, `details` |
| Error categories | New (`src/lib/errors/`) | `VALIDATION`, `NETWORK`, `AUTH`, `CONFLICT`, `NOT_FOUND`, `UNKNOWN` |
| Result typedefs | New (`src/lib/types/`) | Formalize existing `{ ok, data }` / `{ ok, error }` shapes |
| ApiAdapter throws | Modified | `throw new AppError(...)` instead of `throw new Error(...)` |
| Silent return docs | Comments | Annotate each orchestrator `return;` |
| Tests | New | AppError, normalizer, adapter error metadata |

### What HR8 Does NOT Change

| Pattern | Status |
|---------|--------|
| Service layer throw/return contracts | **Document only** — defer unification |
| Orchestrator guard pattern (WP-HR4) | **Preserve exactly** |
| UI feedback methods | **No changes** |
| Retry logic | **No changes** |
| `{ ok, error, data }` field names | **No renames** |

### AppError Category Mapping (ApiAdapter)

The ApiAdapter category mapping is best-effort based on available response metadata. Some responses may not include status codes or may wrap errors in non-standard shapes.

| Condition | Category | Code |
|-----------|----------|------|
| HTTP 400 / validation error | `VALIDATION` | `VALIDATION_ERROR` |
| HTTP 401/403 | `AUTH` | `UNAUTHORIZED` |
| HTTP 404 | `NOT_FOUND` | `RESOURCE_NOT_FOUND` |
| HTTP 409 | `CONFLICT` | `RESOURCE_CONFLICT` |
| HTTP 5xx / server error | `NETWORK` | `SERVER_ERROR` |
| Fetch failure (network down) | `NETWORK` | `FETCH_FAILED` |
| Unknown / unclassifiable | `UNKNOWN` | `UNKNOWN_ERROR` |

## Error Propagation Flow

```
Commands (Zod validate → throw Error)
    ↓
ApiAdapter (fetch → check .ok → throw AppError [HR8])
    ↓
Services (catch/rethrow or check .ok — UNCHANGED in HR8)
    ↓
Orchestrators (guard returns + try/catch → toast/alert)
    ↓
UI (useState error state, toast, showAlertMessage)
```

## Non-Goals (Reiterated)

- No service contract unification (throw→return)
- No error boundary implementation
- No UX or copy changes
- No retry logic changes
- No new features
- No ratchet mechanism (error handling is semantic, not numeric)

## Future Work

- Service layer contract unification (standardize throw vs return)
- React error boundaries
- Error telemetry / centralized logging
- UI error display standardization
- Error recovery patterns
