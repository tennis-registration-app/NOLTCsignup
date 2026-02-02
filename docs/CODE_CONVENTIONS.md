# Code Conventions

## Naming

### Rule: camelCase Internal, snake_case Only at Boundaries

| Context | Convention | Example |
|---------|------------|---------|
| React components | camelCase | `<CourtDisplay courtData={data} />` |
| State variables | camelCase | `const [isAssigning, setIsAssigning] = useState()` |
| Function names | camelCase | `function handleCourtClick()` |
| Internal objects | camelCase | `{ startTime, endTime, courtNumber }` |
| API responses (raw) | snake_case | `{ start_time, end_time, court_number }` |
| Boundary translation | Both | `const { start_time: startTime } = apiResponse` |

### Boundary Definition

A **boundary module** is the first point where raw API data enters ES-module app code.
This includes:
- `src/lib/normalize/**` — API response normalizers
- `src/registration/backend/**` — Backend query/command modules
- Any explicit adapter modules

snake_case is **only allowed** in these boundary modules.

### No Dual-Format Rule

Normalizers must output **one canonical internal shape (camelCase)**. Do not output both:
```javascript
// ❌ Bad: dual-format output
return {
  accountId: raw.account_id,
  account_id: raw.account_id,  // Never do this
};

// ✅ Good: camelCase only
return {
  accountId: raw.account_id,
};
```

### Fix Patterns

**Pattern A: Destructure rename at ingress**
```javascript
// ✅ Good: translate once at the boundary
const { start_time: startTime, court_number: courtNumber } = apiResponse;
```

**Pattern B: Normalize helper**
```javascript
// ✅ Good: use existing normalizer
import { normalizeCourt } from '../lib/normalize/court';
const court = normalizeCourt(apiCourt); // Returns camelCase shape
```

**Pattern C: Map object at ingress**
```javascript
// ✅ Good: explicit mapping when shape is complex
const viewModel = {
  startTime: raw.start_time,
  courtNumber: raw.court_number,
};
```

**Anti-patterns**
```javascript
// ❌ Bad: snake_case property access in UI
if (court.start_time > now) { ... }

// ❌ Bad: dual-format fallback
const id = player.accountId || player.account_id;
```

---

## Module Types

| Type | Location | Purpose |
|------|----------|---------|
| Pure functions | `src/*/utils/`, `src/shared/` | Stateless transforms, validators |
| Hooks | `src/*/hooks/` | React state and effects |
| Orchestrators | `src/*/orchestration/` | Multi-step business operations |
| Handlers | `src/*/handlers/` | Thin UI event wiring |
| Boundary modules | `src/lib/normalize/`, adapters | API ↔ internal translation |

---

## File Rules

- Maximum 500 lines per file
- One primary export per file (exceptions: re-export indexes)
- No new singletons — use dependency injection

---

## ESLint Enforcement

The `camelcase` rule is enabled with `properties: "always"` to catch snake_case property access in UI code.

**Boundary exemptions** (in eslint config overrides):
- `src/lib/normalize/**`
- `src/registration/backend/**`

New snake_case usage outside these paths will fail lint.
