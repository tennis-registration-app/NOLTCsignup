# Type Checking

## Overview

This project uses TypeScript's `checkJs: true` mode to type-check all JavaScript files globally. Type checking is enforced via a ratchet mechanism that prevents type regressions.

`.ts` files are used for orchestrators, presenters, reducers, and type definitions (31 files). Remaining application code uses JSDoc annotations in `.js` / `.jsx` files with `checkJs: true`.

## Why Type Check JS?

JSDoc-based type checking provides type safety without the overhead of a TypeScript migration. Combined with a ratchet, it prevents regressions while allowing gradual adoption.

## How It Works

1. **tsconfig.json** configures `tsc` with `allowJs: true` and `checkJs: true`
2. All `.js` / `.jsx` files under `src/` are type-checked by default
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
# (runs: lint:ratchet → type:ratchet → coverage:ratchet → test:fixtures → build → test:e2e)
```

## Adding Type Coverage to a File

Since `checkJs: true` is set globally, all JS/JSX files under `src/` are already type-checked. No `// @ts-check` directive is needed. Existing `// @ts-check` directives are harmless but redundant.

To improve type coverage in a file, add JSDoc annotations:

### Good candidates

- File is a utility, type definition, or pure function module
- File has few or no side effects
- File has existing JSDoc that can be tightened

### When to defer

- File has many untyped dependencies (would cascade errors)
- File relies heavily on untyped globals (e.g., `window.*` bridge properties)
- Fixing type errors would require cross-file changes

### How to add safely

1. Add or tighten JSDoc annotations (`@type`, `@param`, `@returns`)
2. Run `npm run typecheck -- --pretty false` immediately
3. If errors appear in the file:
   - **Prefer:** Fix JSDoc annotations, add narrowing, or use explicit casts
   - **Acceptable:** `@ts-expect-error` with a reason comment (see Suppression Patterns)
   - **If >5 errors:** Revert annotations and defer to a future commit
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

With `checkJs: true`, all JS/JSX files under `src/` are type-checked. The type ratchet baseline (`typescript-baseline.json`) tracks the current error count — any increase is blocked.

Some files still contain legacy `// @ts-check` directives from the earlier opt-in era. These are harmless and can be removed in cleanup passes.

### Areas with known type noise

| Module | Situation |
|--------|-----------|
| `src/platform/windowBridge.js` | Untyped `window.*` properties; requires extending `global.d.ts` |
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
- `checkJs: true` — All JS/JSX files are type-checked globally
- `strict: false` — Not yet enforcing strict mode
- `types: ["vite/client"]` — Supports `import.meta.env` references
- `baseUrl` + `paths` — Maps `@lib/*` to `src/lib/*` (matches Vite aliases)
- Tests excluded from type checking

### Ratchet

- **Baseline file:** `typescript-baseline.json`
- **Script:** `scripts/type-ratchet.mjs`
- **Env var override:** `TYPESCRIPT_BASELINE_PATH` (for testing without touching committed baseline)

## Future Work

- Extend `global.d.ts` for `window.*` properties to reduce type noise in platform layer
- Consider `strict: true` once type error count is low enough
