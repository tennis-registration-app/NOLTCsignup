# Type Checking

## Overview

This project uses TypeScript's `checkJs` mode to validate existing JSDoc type annotations in JavaScript files. Type checking is enforced via a ratchet mechanism that prevents type regressions.

No `.ts` files are used. All type information is expressed through JSDoc annotations in `.js` / `.jsx` files.

## Why Type Check JS?

JSDoc-based type checking provides type safety without the overhead of a TypeScript migration. Combined with a ratchet, it prevents regressions while allowing gradual adoption.

## How It Works

1. **tsconfig.json** configures `tsc` with `allowJs: true` and `checkJs: false`
2. Individual files opt in via `// @ts-check` at the top
3. `scripts/type-ratchet.mjs` compares error count to a committed baseline
4. Type regressions fail `npm run verify`

## Commands
```bash
# Run type check directly
npm run typecheck

# Run type ratchet (part of verify)
npm run type:ratchet

# Update baseline after fixing type errors
node scripts/type-ratchet.mjs --update

# Compare without failing
node scripts/type-ratchet.mjs --dry-run

# Full verification pipeline
npm run verify
# (runs: lint:ratchet → type:ratchet → test:unit → build → test:e2e)
```

## Adding @ts-check to a File

### When to add

- File has existing JSDoc annotations (`@type`, `@param`, `@returns`)
- File is a utility, type definition, or pure function module
- File has few or no side effects

### When to wait

- File has many untyped dependencies (would cascade errors)
- File relies heavily on untyped globals (e.g., `window.*` bridge properties)
- Fixing type errors would require cross-file changes

### How to add safely

1. Add `// @ts-check` as the first line of the file
2. Run `npm run typecheck -- --pretty false` immediately
3. If errors appear in the file:
   - **Prefer:** Fix JSDoc annotations, add narrowing, or use explicit casts
   - **Acceptable:** `@ts-expect-error` with a reason comment (see Suppression Patterns)
   - **If >5 errors:** Remove `@ts-check` and defer to a future commit
4. Run `npm run verify` to confirm all gates pass
5. If baseline changed, run `node scripts/type-ratchet.mjs --update`

### Example
```javascript
// @ts-check

/**
 * Calculate duration in minutes.
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function durationMinutes(start, end) {
  return (end.getTime() - start.getTime()) / 60000;
}
```

## Suppression Patterns

### Allowed: @ts-expect-error (with reason)

Use only when the runtime contract is correct AND the correct typing would require cross-file churn (out of current scope):
```javascript
// @ts-expect-error -- legacy prop typing mismatch; runtime contract verified
const result = someFunction(untypedArg);
```

### Not allowed: @ts-ignore

`@ts-ignore` suppresses errors silently and permanently. Always use `@ts-expect-error` instead — it alerts you when the suppression is no longer needed.

## Current Coverage

To verify: run `grep -rl "@ts-check" src/ | wc -l`

| Category | Files | Examples |
|----------|-------|---------|
| Router/screens | 13 | CourtRoute.jsx, HomeScreen.jsx |
| Type definitions | 3 | appTypes.js, domain.js, global.d.ts |
| Normalize layer | 5 | normalizeBlock.js, normalizeMember.js |
| Schemas | 1 | apiEnvelope.js |
| **Total** | **22** | |

### Deferred (not yet @ts-checked)

| Module | Reason |
|--------|--------|
| `src/platform/windowBridge.js` | 18+ errors from untyped `window.*` properties; requires extending `global.d.ts` |
| `src/registration/orchestration/` | Recently refactored; let settle before type enforcement |
| `src/registration/services/` | Complex API layer; high churn risk |
| `src/admin/` | Large; modularization pending |

## Global Type Declarations

`src/types/global.d.ts` declares legacy globals referenced by @ts-check files:

- `window.Tennis` — Platform namespace (legacy bridge), typed as `any`
- `window.UI` — UI namespace (legacy bridge), typed as `any`

Note: `API_CONFIG.IS_MOBILE` is typed via the `ApiConfigShape` typedef in `src/lib/apiConfig.js`, not as a bare global.

These declarations are intentionally permissive to avoid scope creep.

## Configuration

### tsconfig.json

Key settings:
- `checkJs: false` — Global default off; files opt in via `// @ts-check`
- `strict: false` — Not yet enforcing strict mode
- `types: ["vite/client"]` — Supports `import.meta.env` references
- `baseUrl` + `paths` — Maps `@lib/*` to `src/lib/*` (matches Vite aliases)
- Tests excluded from type checking

### Ratchet

- **Baseline file:** `typescript-baseline.json`
- **Script:** `scripts/type-ratchet.mjs`
- **Env var override:** `TYPESCRIPT_BASELINE_PATH` (for testing without touching committed baseline)

## Future Work

- Expand @ts-check to platform layer (after extending global.d.ts for window.* properties)
- Expand @ts-check to orchestration layer (after patterns stabilize)
- Consider `strict: true` once coverage is sufficient
- Upgrade `no-undef` ESLint rule from warning to error
