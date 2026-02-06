# API Facade Testing

## Overview

The codebase includes integration tests for the API facade layer — the code between orchestrators and the network. These tests verify endpoint routing, payload construction, response normalization, caching behavior, and error propagation without network access.

## Where This Boundary Sits

The application has three test layers:

1. **Orchestrator unit tests** test business logic with mocked `deps` objects. They do not exercise the API facade.
2. **API facade integration tests** (this layer) test the real ApiAdapter, backend classes, normalization, and caching with only `globalThis.fetch` stubbed. They verify that the facade correctly translates between orchestrator calls and network requests.
3. **E2E tests** (Playwright) test full user flows with Playwright route interception at the HTTP layer.

This layer fills the gap between orchestrator mocks and E2E flows, ensuring the API facade layer — which has real logic (payload mapping, normalization, caching, error wrapping) — is covered by fast, deterministic tests.

## Test Architecture
```text
┌─────────────────────────────────────────────────┐
│                   Unit Tests                     │
│                                                  │
│  TennisCommands.test    TennisQueries.test       │
│  TennisDirectory.test   ApiAdapter.test          │
│                                                  │
│         ↓ real code ↓         ↓ real code ↓      │
│                                                  │
│  TennisCommands    TennisQueries   TennisDir.    │
│         ↓                ↓              ↓        │
│              ApiAdapter (real)                    │
│                     ↓                            │
│          globalThis.fetch (STUBBED)              │
└─────────────────────────────────────────────────┘
```

**Mock boundary:** `globalThis.fetch` is stubbed at test setup. Everything above the stub — ApiAdapter, backend classes, normalization, caching — runs as real production code.

## Mock Fetch Helper

**Location:** `tests/unit/api/helpers/mockFetch.js`

| Function | Purpose |
|----------|---------|
| `stubFetch(envelope)` | Stub fetch to return a JSON envelope |
| `stubFetchReject(message)` | Stub fetch to reject (network failure) |
| `stubFetchSequence(envelopes)` | Stub fetch to return different responses per call |
| `restoreFetch()` | Restore original fetch (call in `afterEach`) |

The helper captures `ORIGINAL_FETCH` once at module load. There is no `saveFetch()` — simply call `restoreFetch()` in `afterEach` to restore the original.

```javascript
afterEach(() => {
  restoreFetch();
});
```

## Test Suites

### ApiAdapter.test.js (15 tests)

Tests the core network boundary and the **dual-semantics contract**:

- `_fetch()` **throws** `AppError` on envelope `ok:false` or network failure (per error contract)
- `get()` **returns** raw envelope on `ok:false` without throwing
- `post()` **returns** raw envelope on `ok:false` without throwing
- Both `get()`/`post()` **throw** on network failure (fetch itself rejects)
- URL construction and header passing verified
- AppError passthrough (no double-wrapping)

This dual-semantics contract is the most important behavioral fact in the API layer: `_fetch` throws on envelope failure, but the public `get`/`post` methods only throw on network failure.

### TennisCommands.test.js (13 tests)

Tests the command translation layer (input → endpoint + payload → raw envelope):

- Endpoint routing (e.g., `assignCourt` → `/assign-court`)
- Payload mapping via wire mappers (camelCase input → snake_case payload)
- Device metadata auto-addition by adapter
- Raw envelope passthrough (commands do not transform responses)
- Failure envelope returned without throwing
- Network failure propagation

Representative commands tested: `assignCourt`, `endSession`, `joinWaitlist`.

### TennisQueries.test.js (14 tests)

Tests the query normalization chain:

- `getBoard()`: endpoint routing, normalization via `normalizeBoard()`, `_raw` attachment, `_lastBoard` caching
- `getBoard()` error paths: throws `Error(response.message)` on `ok:false`, fallback message
- `getFrequentPartners()`: passthrough contrast (returns raw envelope)
- Cache behavior: `getLastBoard()` null before fetch, populated after `refresh()`

Requires `vi.mock('@supabase/supabase-js')` because the constructor creates a Supabase realtime client.

### TennisDirectory.test.js (33 tests)

Tests member lookup with caching and normalization:

- Normalization: snake_case → camelCase mapping with dual-format aliases
- `searchMembers`: query param encoding, returns `[]` on `ok:false`
- `getMembersByAccount`: member_number param, caching, normalization
- `getAllMembers`: cached under `__all__` key
- `findMemberByName`: matching logic (exact, partial, fallback)
- Cache hit/miss: second call skips fetch
- Cache TTL: `vi.useFakeTimers()` + `vi.advanceTimersByTime()` past 5 minutes triggers re-fetch
- Cache invalidation: `invalidateAccount()`, `invalidateAll()`, `clearCache()`
- Error handling: returns `[]` on `ok:false`; network failures propagate (thrown)

## Adding New API Tests

1. Import the mock helper:
```javascript
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
```

2. Set up restore in every suite:
```javascript
afterEach(() => {
  restoreFetch();
});
```

3. Stub fetch with the expected envelope:
```javascript
stubFetch({ ok: true, data: { ... } });
```

4. Use real ApiAdapter + real backend class — only fetch is mocked.

5. For URL param assertions, use a helper to extract params:
```javascript
function getParam(url, name) {
  const match = url.match(new RegExp(`[?&]${name}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
```

6. For cache TTL tests, use `vi.useFakeTimers()` + `vi.advanceTimersByTime()` and always restore with `vi.useRealTimers()`.

## What Is Not Tested (and Why)

| Component | Reason |
|-----------|--------|
| ApiTennisService | Creates ApiAdapter internally (no DI), pulls in RealtimeClient side effects. Needs refactoring for testability. |
| boardApi | Redundant with TennisQueries.getBoard() as currently used; if boardApi becomes a primary entrypoint again, add a minimal smoke test. |
| AdminCommands | 20 methods with response normalization. Deferred to avoid scope creep. |
| Realtime subscriptions | Depends on Supabase WebSocket client. Separate concern from API facade. |
| E2E API behavior | Covered by Playwright tests with route interception. |

## Error Handling Contracts

| Layer | On `ok:false` envelope | On network failure |
|-------|------------------------|-------------------|
| `ApiAdapter._fetch` | Throws `AppError(NETWORK/API_ERROR)` | Throws `AppError(NETWORK/FETCH_FAILED)` |
| `ApiAdapter.get/post` | Returns raw envelope | Throws (fetch rejects) |
| TennisCommands | Returns raw envelope (passthrough) | Throws (propagated) |
| TennisQueries.getBoard | Throws `Error(response.message)` | Throws (propagated) |
| TennisQueries.getFrequentPartners | Returns raw envelope | Throws (propagated) |
| TennisDirectory | Returns `[]` | Throws (propagated) |

## Test Counts Summary

| File | Tests |
|------|-------|
| ApiAdapter.test.js | 15 |
| TennisCommands.test.js | 13 |
| TennisQueries.test.js | 14 |
| TennisDirectory.test.js | 33 |
| **Total API facade tests** | **75** |
