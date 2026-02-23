# Latent Bugs Backlog

Bugs discovered during the quality review cycle (57 commits, Feb 2026). Each was documented in test comments or commit messages but intentionally not fixed — all changes were test-only or structural.

## Priority 1 — Production Risk

| # | Bug | Module | Severity | Current Behavior | Expected Behavior | Discovered By | Test Coverage |
|---|-----|--------|----------|-----------------|-------------------|---------------|---------------|
| 1 | ~~Zod v4 `.issues` vs `.errors` mismatch~~ | `src/lib/commands/*.js` | ~~**High**~~ **FIXED** | ~~Command builders catch Zod validation errors and access `result.error.errors` — but Zod v4 uses `.issues`. Throws `TypeError: Cannot read properties of undefined` instead of formatted validation message.~~ | Fixed: `.errors` → `.issues` in all 11 command builders. | TennisCommands test suite (commit 8241016) | Failing test added, then fix applied. 4 new tests. |
| 2 | ~~`updateSettings` cache timestamp not cleared~~ | `src/lib/ApiAdapter.js` | ~~**High**~~ **FIXED** | ~~`updateSettings()` sets `this._cache.settings = null` but does not clear `this._cache.settingsTime`. Next `getSettings()` call sees valid timestamp, returns `null` from cache.~~ | Fixed: added `settingsTime = 0` in all 4 settings-mutation methods. | ApiAdapter test suite (commit after 6bbaa08) | Failing test replaced buggy-behavior test. |
| 3 | ~~Block-vs-session priority in `clearCourtOp`~~ | `src/admin/handlers/courtOperations.js` | ~~**Medium**~~ **FIXED** | ~~When a court has both a block and a session, only the block is cancelled (if/else chain). Session is left running underneath.~~ | Fixed: `else if` → independent `if` checks. Both block and session cleared when both exist. Matches `clearAllCourtsOp` pattern. | courtOperations test suite (commit in admin bootstrap) | Existing test updated + edge case added (block fail → session still cleared). |

## Priority 2 — Correctness

| # | Bug | Module | Severity | Current Behavior | Expected Behavior | Discovered By | Test Coverage |
|---|-----|--------|----------|-----------------|-------------------|---------------|---------------|
| 4 | ~~`getUsageComparison` sends camelCase keys~~ | `src/lib/backend/admin/AdminCommands.js` | ~~**Medium**~~ **FIXED** | ~~Sends `primaryStart`, `primaryEnd`, `comparisonStart` as camelCase. All other POST methods map to snake_case.~~ | Fixed: now sends snake_case (`primary_start`, `primary_end`, `comparison_start`) matching all 14 sibling methods. Falls back to legacy camelCase on schema rejection (no business denial code). | AdminCommands test suite | 4 tests: snake_case default, defaults, camelCase fallback on rejection, no retry on business denial. |
| 5 | `applyBlocksOp` early return on invalid block | `src/admin/handlers/applyBlocksOperation.js` | **Medium** | `return` inside `for...of` loop on first invalid block skips all remaining blocks (valid or not). | Should collect errors and continue processing valid blocks, or validate all before applying any. | applyBlocksOperation test suite | Test documents actual behavior |
| 6 | `runtimeConfig.js` dead production check | `src/config/runtimeConfig.js` | **Medium** | `DEV_DEFAULTS` applied via `||` before `!value` check. Production build with no env vars silently uses dev Supabase credentials. | Production check should compare against dev defaults, or build-time script should be the sole gate (currently is). | Env contract baseline evidence (commit 6bbaa08) | Build-time `check-env.js` is the real gate |
| 7 | `handleRemoveBlock` fire-and-forget during edit | `src/admin/blocks/hooks/useBlockActions.js` | **Medium** | When editing a block, old block deletion is called without `await`. If `cancelBlock` fails, new blocks are still applied — ghost duplicate. | Should `await` the cancellation and abort if it fails. | useBlockActions test suite | Test documents actual behavior |

## Priority 3 — Minor / Cosmetic

| # | Bug | Module | Severity | Current Behavior | Expected Behavior | Discovered By | Test Coverage |
|---|-----|--------|----------|-----------------|-------------------|---------------|---------------|
| 8 | `moveCourtOp` uses `toast()` while others use `showNotification` | `src/admin/handlers/courtOperations.js` | **Low** | Inconsistent notification channel — dispatches `CustomEvent('UI_TOAST')` instead of injected callback. | Should use `showNotification` for consistency. | courtOperations test suite | Not directly tested (notification channel) |
| 9 | `getTransactions` "no query string" path is dead code | `src/lib/backend/admin/AdminCommands.js` | **Low** | `limit` defaults to 100, so the `queryString ? url + '?' + qs : url` ternary always takes the truthy branch. | Remove dead branch or make limit truly optional. | AdminCommands test suite | Test documents actual behavior |
| 10 | Block ID collision risk | `src/admin/blocks/hooks/useBlockActions.js` | **Low** | `Date.now().toString() + Math.random()` for block IDs. Not a UUID, could collide in rapid succession. | Use `crypto.randomUUID()` or similar. Harmless if backend ignores client IDs. | useBlockActions test suite | Not directly testable |
| 11 | Title-casing regex capitalizes after apostrophes | `src/admin/blocks/hooks/useBlockActions.js` | **Low** | `/\b\w/g` matches after `'` and `-`, producing "Don'T", "Pre-Season". | Use a smarter regex or dedicated helper. | useBlockActions test suite | Cosmetic only |
| 12 | Legacy useWetCourts duplicates reducer-based hook — no-op setters discard state | `src/admin/blocks/hooks/useWetCourts.js` | **Medium** | Two useWetCourts hooks exist: (1) `wetCourts/useWetCourts.js` owns state via useReducer, works correctly; (2) `blocks/hooks/useWetCourts.js` receives no-op setters from useAdminAppState (lines 69-71), state updates silently discarded. CompleteBlockManagerEnhanced calls legacy hook, making duplicate backend calls. App works because `bumpRefreshTrigger` triggers board re-fetch. | Remove legacy hook usage from CompleteBlockManagerEnhanced, wire to controller actions. Remove no-op setters. | WP-ADMIN-EXTRACTION-POLISH investigation | Reducer: 25 tests via wetCourtsReducer.test.js. Legacy hook: 0 tests. |

## Fix Strategy

Each fix follows the pattern established in this review cycle:
1. Write a failing test that captures expected behavior
2. Apply the minimal fix
3. Verify existing tests still pass
4. Commit with evidence

Bugs #1 and #2 are recommended first — they have the highest blast radius and the simplest fixes.
