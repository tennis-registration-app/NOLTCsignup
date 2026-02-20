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

## 4. Where AppError Is Used

`ApiAdapter._fetch()` is the sole throw site. Two cases:

1. **API returned `ok: false`**: `AppError({ category: NETWORK, code: 'API_ERROR', ... })`
2. **Network/fetch failure**: `AppError({ category: NETWORK, code: 'FETCH_FAILED', ... })`

The private methods (`_get`, `_post`) propagate these throws. The public
methods (`get`, `post`) return raw `{ ok: false }` responses instead — see
the dual error contract documented in `ApiAdapter.js`.

## 5. Usage

```javascript
import { AppError, ErrorCategories } from '../errors/index.js';

try {
  await adapter._get('/endpoint');
} catch (e) {
  if (e instanceof AppError) {
    console.log(e.category, e.code, e.details);
  }
}
```
