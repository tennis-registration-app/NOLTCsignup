# Error Contract

## 1. Purpose

The application uses a single structured error class (`AppError`) for
programmatic error handling. All other errors flow as plain `Error` instances.

## 2. AppError Shape

```javascript
{
  name: 'AppError',
  category: ErrorCategory,  // 'VALIDATION' | 'NETWORK' | 'AUTH' | 'CONFLICT' | 'NOT_FOUND' | 'UNKNOWN'
  code: string,             // Machine-readable code (e.g., 'API_ERROR', 'FETCH_FAILED')
  message: string,          // Human-readable message
  details: any,             // Raw response or original error (for debugging)
}
```

## 3. Error Categories

Defined in `src/lib/errors/errorCategories.js`:

| Category | Description |
|----------|-------------|
| `VALIDATION` | Input validation failures (bad data, schema errors) |
| `NETWORK` | Network/transport failures (fetch errors, timeouts, 5xx) |
| `AUTH` | Authentication/authorization failures (401, 403) |
| `CONFLICT` | Resource conflict (409, concurrent modification) |
| `NOT_FOUND` | Resource not found (404) |
| `UNKNOWN` | Unclassifiable errors |

## 4. ApiAdapter Error Contract

**Private methods** (`_fetch`, `_get`, `_post`): throw `AppError` on failure.
Used by legacy domain methods (getCourtStatus, assignCourt, etc.).

**Public methods** (`get`, `post`): return response object. On failure, include
structured error metadata:

```javascript
{
  ok: false,
  code: '...',           // DenialCode or 'API_ERROR'
  message: '...',        // Human-readable
  error: {               // Structured metadata (always present on failure)
    category: '...',     // ErrorCategories value (NETWORK, VALIDATION, etc.)
    code: '...',         // Same as top-level code (or 'API_ERROR' fallback)
    message: '...',      // Same as top-level message (or fallback)
  }
}
```

On network or JSON parse failure:

```javascript
{
  ok: false,
  message: '...',        // Error message from the exception
  error: {
    category: 'NETWORK',
    code: 'FETCH_FAILED',
    message: '...',      // Same as top-level message
  }
}
```

Category mapping is handled by `mapResponseToCategory()` in
`src/lib/errors/mapResponseToCategory.js`. Unknown or missing codes map to `UNKNOWN`.

## 5. Where AppError Is Thrown

`ApiAdapter._fetch()` is the sole throw site for private methods. Two cases:

1. **API returned `ok: false`**: `AppError({ category: NETWORK, code: 'API_ERROR', ... })`
2. **Network/fetch failure**: `AppError({ category: NETWORK, code: 'FETCH_FAILED', ... })`

`TennisQueries.getBoard()` also throws `AppError` after checking public method
responses — using `response.error.category` from the structured metadata.

## 6. Usage

```javascript
// Private method callers (legacy domain methods):
try {
  await adapter._get('/endpoint');
} catch (e) {
  if (e instanceof AppError) {
    console.log(e.category, e.code, e.details);
  }
}

// Public method callers (TennisBackend facade):
const response = await adapter.post('/endpoint', body);
if (!response.ok) {
  // response.error.category, response.error.code, response.error.message
  alert(response.error.message);
}
```
