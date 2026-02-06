# WP6-B Prototype-Origin Cleanup Scan Report

**Date:** 2026-02-05
**Auditor:** Claude Code
**Scope:** NOLTCsignup frontend repository (src/, shared/, domain/)
**Gate Status:** ✅ `npm run verify` passed (15/15 E2E tests)

---

## Executive Summary

The codebase is remarkably clean for its size (293 JS/JSX files). Key findings:

| Category | Items Found | Assessment |
|----------|-------------|------------|
| Dead code / orphaned files | 3 | 🟡 Test directories, duplicate StorageAdapter |
| console.* statements in src/ | 0 | 🟢 All routing through logger |
| console.* statements in shared/domain/ | 50+ | 🟡 Intentional (selfTest, error handlers) |
| TODO/FIXME/HACK comments | 0 | 🟢 Clean |
| Files over 500 LOC | 13 | 🟡 Documented, tracked |
| Unused dependencies | 0 | 🟢 All dependencies used |
| Project management references in source | 0 | 🟢 Clean |
| Project management references in docs | 30+ | 🟡 Review for hand-off |

**Overall Assessment:** The source code is production-ready. Documentation contains internal project management language that should be reviewed for external hand-off.

---

## D1 — Dead Code / Unreachable Paths

### 🟡 Test Directories (Cleanup Candidate)

| Directory | Files | Purpose | Recommendation |
|-----------|-------|---------|----------------|
| `src/test-react/` | 2 | Vite React smoke test | Keep or remove (low impact) |
| `src/test-api/` | 1 | API testing page | Keep or remove (low impact) |
| `src/test-react-api/` | 2 | Combined test page | Keep or remove (low impact) |

These are in `vite.config.js` rollupOptions.input, so they're intentionally built. Decision: Keep for debugging or remove if not used.

### 🟡 Duplicate StorageAdapter Files

| File | Status |
|------|--------|
| `src/lib/StorageAdapter.js` | Exported from `src/lib/index.js` |
| `src/registration/services/StorageAdapter.js` | Uses `@lib` alias, identical except imports |

**Analysis:** Both files are nearly identical (diff shows only import path changes). The `src/registration/services/StorageAdapter.js` appears to be a duplicate that should be removed.

**Usage Check:**
- `LocalStorageAdapter` and `storageAdapter` are exported from `src/lib/index.js`
- No imports found in application code that use these exports
- The app uses `ApiAdapter` instead

**Recommendation:** Remove `src/registration/services/StorageAdapter.js` (duplicate). Consider removing `src/lib/StorageAdapter.js` if truly unused (verify with Overseer).

### 🟢 No Commented-Out Code Blocks Found

Searched for:
- `// function`, `// const`, `// let`, `// return`, `// if`
- Multi-line `/* */` blocks containing code

Result: No significant commented-out code found.

---

## D2 — Debug Artifacts

### 🟢 Source Directory (src/) — Clean

| Statement Type | Count | Status |
|----------------|-------|--------|
| `console.log` | 0 | ✅ |
| `console.warn` | 0 | ✅ |
| `console.error` | 0 | ✅ |
| `console.debug` | 0 | ✅ |
| `debugger` | 0 | ✅ |

All console logging in `src/` routes through `src/lib/logger.js` which uses a configurable log level. This is the correct pattern.

### 🟡 Shared/Domain Directories — Intentional Debug Output

| File | Count | Type | Assessment |
|------|-------|------|------------|
| `shared/events.js` | 5 | Error handling + debug | 🟢 Intentional (guarded by debug flag) |
| `shared/domain/roster.js` | 3 | Debug logging | 🟡 Review — appears to be debug leftovers |
| `shared/storage.js` | 8 | Error/warn handlers | 🟢 Intentional (StorageGuard protection) |
| `domain/availability.js` | 3 | Debug logging | 🟡 Review — "SUSPICIOUS" logging |
| `domain/blocks.js` | 1 | Error handling | 🟢 Intentional |
| `domain/selfTest.js` | 38 | Test output | 🟢 Intentional (self-test module) |

**Specific Review Items:**

1. **`shared/domain/roster.js:184,197`** — Debug console.log for `findEngagementFor`
   ```javascript
   console.log('[findEngagementFor] Looking for player:', { ... });
   console.log('[findEngagementFor] Found match on court', i + 1, ':', { ... });
   ```
   **Recommendation:** 🟡 Remove or guard with debug flag

2. **`domain/availability.js:240,440,455`** — Debug logging for court selection
   ```javascript
   console.log('🔍 getFreeCourtsInfo - ALL COURTS FREE detected:', { ... });
   console.log('🚨 [getSelectableCourtsStrict] SUSPICIOUS - ALL COURTS FREE!', { ... });
   console.log('[getSelectableCourtsStrict] Normal:', { ... });
   ```
   **Recommendation:** 🟡 Remove or guard with debug flag (these look like development debug statements)

### 🟢 No Hardcoded Bypass Flags

Searched for: `BYPASS`, `FORCE_`, `TEST_`, `DEBUG_`, `SKIP_`
Result: None found.

---

## D3 — Comment Hygiene

### 🟢 No Stale TODO/FIXME/HACK Comments

| Comment Type | Count | Status |
|--------------|-------|--------|
| `TODO` | 0 | ✅ |
| `FIXME` | 0 | ✅ |
| `HACK` | 0 | ✅ |

### 🟢 No Legacy/Deprecated Comments Found

Searched for: `old`, `legacy`, `deprecated`, `remove`, `temporary`, `workaround`
Result: None found in source code.

### 🟢 Comment Quality

The codebase uses JSDoc comments extensively for:
- Function documentation
- Type definitions
- Module headers

Comments describe "why" rather than "what" — this is the correct pattern.

---

## D4 — Naming Inconsistencies

### 🟢 No snake_case Outside Boundary Files

The ESLint ratchet enforces camelCase in application code. Boundary files (normalizers, ApiAdapter, wire.js) are explicitly allowed snake_case for API compatibility.

### 🟢 No Vague Variable Names Found

Searched for: `const data =`, `let result =`, `const temp =`, `let info =`
Result: None found.

### 🟡 Kebab-Case File Names (Intentional)

| File | Purpose | Assessment |
|------|---------|------------|
| `src/registration/nav-diagnostics.js` | Plain JS (IIFE) | 🟢 Intentional — loaded via `<script src>` |
| `src/courtboard/sync-promotions.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/courtboard/mobile-bridge.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/courtboard/bridge/window-bridge.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/courtboard/debug-panel.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/courtboard/browser-bridge.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/courtboard/mobile-fallback-bar.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/lib/browser-bridge.js` | Plain JS (IIFE) | 🟢 Intentional |
| `src/lib/test-normalize.js` | Test utility | 🟡 Review — may be test artifact |
| `src/lib/court-blocks.js` | Module | 🟢 Consistent with pattern |

These kebab-case files are plain JavaScript loaded via `<script>` tags (IIFEs), not ES modules. The naming convention distinguishes them from bundled modules.

---

## D5 — Structural Artifacts

### 🟡 Files Over 500 LOC (13 Files)

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `src/admin/blocks/CompleteBlockManagerEnhanced.jsx` | 899 | 🟡 Documented | Admin block manager |
| `src/admin/screens/SystemSettings.jsx` | 737 | 🟡 | System settings UI |
| `src/registration/screens/AdminScreen.jsx` | 717 | 🟡 Documented | Registration admin |
| `src/registration/screens/SuccessScreen.jsx` | 690 | 🟡 | Success screen |
| `src/registration/screens/GroupScreen.jsx` | 687 | 🟡 | Group registration |
| `src/admin/courts/CourtStatusGrid.jsx` | 644 | 🟡 | Court grid UI |
| `src/admin/App.jsx` | 629 | 🟡 Documented | Admin app root |
| `src/admin/calendar/EventCalendarEnhanced.jsx` | 574 | 🟡 | Calendar component |
| `src/courtboard/components/TennisCourtDisplay.jsx` | 550 | 🟡 | Court display |
| `src/registration/backend/TennisCommands.js` | 548 | 🟡 | Command handlers |
| `domain/selfTest.js` | 528 | 🟢 Intentional | Self-test module |
| `src/admin/ai/MockAIAdmin.jsx` | 527 | 🟡 | AI mock interface |
| `src/admin/types/domainObjects.js` | 519 | 🟢 Intentional | Type definitions |

**Notes:**
- `ARCHITECTURE.md` documents why `src/admin/App.jsx` exceeds 500 lines (WP5+ scope)
- Registration App.jsx was successfully reduced from 3,491 to 349 lines
- Screens are UI-heavy and harder to decompose than logic files

### 🟢 Index Files (Barrel Exports) — Intentional

21 small index.js files found (1-9 lines each). These are barrel export files — intentional pattern for clean imports.

### 🟢 Path Aliases Used Consistently

Searched for relative imports to `@lib`, `@shared`, `@domain` directories. No violations found — all imports use aliases.

---

## D6 — Package / Config Hygiene

### 🟢 All Dependencies Used

| Package | Import Count | Status |
|---------|--------------|--------|
| `@supabase/supabase-js` | 2 | ✅ |
| `html5-qrcode` | 1 | ✅ |
| `qrcode.react` | 1 | ✅ |
| `react` | 136 | ✅ |
| `react-dom` | 5 | ✅ |
| `zod` | 12 | ✅ |

### 🟢 Config Files Consistent

| Setting | vite.config.js | vitest.config.js | Status |
|---------|----------------|------------------|--------|
| `@shared` alias | ✅ `./shared` | ✅ `./shared` | ✅ Match |
| `@domain` alias | ✅ `./domain` | ✅ `./domain` | ✅ Match |
| `@lib` alias | ✅ `./src/lib` | ✅ `./src/lib` | ✅ Match |

### 🟢 Scripts Are Current

All npm scripts in `package.json` reference current tooling:
- `vite` for build/dev
- `vitest` for unit tests
- `playwright` for E2E tests
- `eslint` + `prettier` for linting

No deprecated or orphaned scripts found.

---

## D7 — Internal Project Management References

### 🟢 Source Code — Clean

No project management references found in `src/`, `shared/`, or `domain/`:
- Phase references: 0
- WP references: 0
- Governance references: 0
- Sprint/milestone language: 0

### 🟡 Documentation — Contains Project History

**README.md** (5 references):
- "Phase 3: Globals & Event Cleanup (Complete)"
- "Phase 2.2: Admin BlockManager Decomposition (Complete)"
- "Phase 2.X: Overtime Eligibility Centralization (Complete)"
- "Phase 2.1: Registration App Hooks (Complete)"
- "Playwright in Phase 1"

**ARCHITECTURE.md** (20+ references):
- "Phase 2.2", "WP4 Phase 1", "WP4 Phase 2"
- "WP5 Cleanup", "WP5+", "WP5.9", "WP6"
- "Phase 4 (Backend Hygiene & Security)"
- "WP6.3–6.6", "post-WP6"

**Assessment:** These references document the evolution of the codebase and provide historical context. For internal use, this is valuable. For external hand-off, consider:

1. **Option A:** Keep as-is (provides context for understanding architectural decisions)
2. **Option B:** Create a clean "handoff version" that removes phase/WP language
3. **Option C:** Consolidate into a single CHANGELOG.md for history

**Recommendation:** For professional external hand-off, consider Option B or C. The current documentation reads like internal project management rather than engineering documentation.

---

## Summary by Severity

### 🔴 Unprofessional (Remove/Fix Immediately)

None found.

### 🟡 Cleanup Candidate (Improve, Overseer Decides)

| Item | Location | Recommendation |
|------|----------|----------------|
| Duplicate StorageAdapter | `src/registration/services/StorageAdapter.js` | Remove |
| Debug console.log | `shared/domain/roster.js:184,197` | Remove or guard |
| Debug console.log | `domain/availability.js:240,440,455` | Remove or guard |
| Test directories | `src/test-*/` | Keep or remove (low impact) |
| Files >500 LOC | 13 files | Continue decomposition in future phases |
| Project management language | README.md, ARCHITECTURE.md | Review for hand-off |

### 🟢 Intentional / Preserve

| Item | Location | Reason |
|------|----------|--------|
| Kebab-case file names | `*-bridge.js`, `*-panel.js`, etc. | Plain JS IIFEs loaded via `<script>` |
| console.* in selfTest.js | `domain/selfTest.js` | Self-test output module |
| console.* in storage.js | `shared/storage.js` | StorageGuard error handling |
| console.* in events.js | `shared/events.js` | Error boundaries + debug flag |
| Index files (1-9 lines) | 21 files | Barrel export pattern |
| domainObjects.js (519 lines) | `src/admin/types/` | Type definitions (JSDoc) |

---

## Recommended Actions

### Immediate (Low Effort, High Impact)

1. **Remove duplicate StorageAdapter:**
   ```bash
   rm src/registration/services/StorageAdapter.js
   ```

2. **Remove debug console.log in roster.js:**
   Lines 184 and 197 — remove or wrap in debug flag

3. **Remove debug console.log in availability.js:**
   Lines 240, 440, 455 — remove or wrap in debug flag

### Deferred (Overseer Decision)

1. **Test directories:** Keep for debugging or remove if unused
2. **Project management language in docs:** Review for external hand-off
3. **Files >500 LOC:** Continue decomposition per existing roadmap

---

*Report generated by WP6-B Discovery audit. For questions, see ARCHITECTURE.md.*
