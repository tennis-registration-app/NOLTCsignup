# ESLint Ratchet

## Overview

This document describes the ESLint ratchet mechanism that prevents lint regressions and ensures the codebase becomes progressively cleaner over time.

## Why Ratchet?

Warnings accumulate silently over time. A ratchet:
- **Prevents growth** — new code cannot introduce additional warnings
- **Allows gradual cleanup** — warnings can be fixed incrementally in later WPs
- **Makes progress measurable** — baseline tracks improvement over time
- **Doesn't block current work** — existing warnings are grandfathered

## How It Works

1. **Baseline captured** — Current warning/error counts stored in `eslint-baseline.json`
2. **Ratchet enforced** — A script compares current counts to baseline
3. **Fails on regression** — Any increase in warnings/errors fails the build
4. **Allows improvement** — Decreases are allowed (and baseline can be updated)

## Current Baseline (WP-HR7)

Captured on: 2026-02-01 (see git history for exact commit)

| Metric | Count |
|--------|-------|
| Errors | 0 |
| Warnings | 36 |
| Files with warnings | 18 |

### Warning Breakdown by Rule

| Rule | Count | Notes |
|------|-------|-------|
| `no-unused-vars` | 34 | Most common — unused parameters/variables |
| `react-hooks/exhaustive-deps` | 2 | Missing hook dependencies |

### Files with Most Warnings

| File | Count |
|------|-------|
| `src/registration/appHandlers/useRegistrationAppState.js` | 8 |
| `src/admin/App.jsx` | 4 |
| `src/registration/appHandlers/useRegistrationHandlers.js` | 4 |
| `src/registration/nav-diagnostics.js` | 4 |
| `src/courtboard/components/CourtCard.jsx` | 2 |
| `src/registration/services/index.js` | 2 |

## Lint Configuration

- **Config file:** `eslint.config.js` (ESLint 9.x flat config)
- **Plugins:** `react`, `react-hooks`, `prettier`
- **Runs in:** `npm run verify` (first step)

### Rule Severity

**Errors (block build):**
- `react-hooks/rules-of-hooks`
- `no-redeclare`
- `no-restricted-imports`

**Warnings (ratcheted):**
- `no-unused-vars` (with `argsIgnorePattern: '^_'`)
- `react-hooks/exhaustive-deps`
- `no-undef` (TODO: upgrade to error)
- `no-empty`
- `no-case-declarations`
- `no-unreachable`
- `react/display-name`
- `react/jsx-no-undef`
- `react/no-unescaped-entities`

## Ratchet Design

### Script Location

`scripts/lint-ratchet.mjs` — Runs ESLint and compares to baseline.

### Exact Lint Command

The ratchet script executes ESLint with JSON output for deterministic parsing:
```bash
npx eslint src/ --ext .js,.jsx --format json
```

**Note:** The ratchet compares ESLint JSON output, not console output. This ensures deterministic, machine-readable results.

### Baseline File

`eslint-baseline.json` — Stores baseline counts in a stable format:
```json
{
  "errors": 0,
  "warnings": 36,
  "byRule": {
    "no-unused-vars": 34,
    "react-hooks/exhaustive-deps": 2
  }
}
```

No timestamps in baseline (determinism).

### Pass/Fail Logic

- **FAIL** if `currentErrors > baseline.errors`
- **FAIL** if `currentWarnings > baseline.warnings`
- **PASS** if counts are equal or lower (improvement allowed)

### Proposed CLI Interface

*(To be implemented in Commit 2)*
```bash
# Run ratchet check
npm run lint:ratchet

# Update baseline after fixing warnings (proposed)
npm run lint:ratchet -- --update-baseline

# View current counts vs baseline without failing (proposed)
npm run lint:ratchet -- --dry-run
```

### Integration

*(To be wired in Commit 3)*

The ratchet will be integrated into `npm run verify`:
```json
"verify": "npm run -s lint:ratchet && npm run -s test:unit && npm run -s build && npm run -s test:e2e"
```

## Reducing the Baseline

When fixing lint warnings:

1. Fix the warnings (ensure no behavior change)
2. Run `npm run verify` to confirm tests pass
3. Update the baseline to capture new counts
4. Commit both the fix and the updated baseline

**Rules for baseline reduction:**
- Only fix isolated, obviously safe warnings
- Do not change runtime logic
- Prefer `no-unused-vars` fixes (delete or prefix with `_`)
- Avoid complex refactors for lint compliance

## Future Work

- Upgrade `no-undef` from warning to error
- Consider adding `@typescript-eslint` for gradual type checking
- Integrate with CI status checks (if not already)
- Reduce baseline incrementally in follow-on WPs
