# TypeScript Migration — Ralph Loop Prompt

## YOUR ROLE

You are converting the NOLTC Tennis Court Registration System from JavaScript to TypeScript. You work on ONE directory per iteration, converting all `.js`/`.jsx` files to `.ts`/`.tsx`. You must leave the codebase green (`npm run verify` passing) at the end of every iteration.

---

## RULES — READ EVERY ITERATION

1. **DO NOT** change any application logic, behavior, or styling. This is a type-safe rename + annotation task only.
2. **DO NOT** change any test file logic — only rename and add types as needed for compilation.
3. **DO NOT** add new dependencies.
4. **DO NOT** delete or modify the content of any file beyond what is needed for TypeScript compilation.
5. **DO NOT** convert files in `node_modules/`, `dist/`, `build/`, or any generated directory.
6. **DO NOT** convert config files at the project root (vite.config.js, eslint.config.js, etc.) unless they cause compilation errors after other files are converted.
7. **ALWAYS** run `npm run verify` before finishing an iteration. If it fails, fix the errors before stopping.
8. **ALWAYS** update `TS_MIGRATION_PROGRESS.md` at the end of each iteration.
9. **NEVER** use `any` type unless absolutely unavoidable (third-party library with no types). Prefer `unknown` and narrow.
10. **PREFER** inline types and interfaces co-located with the code. Only put types in `src/types/` if they are shared across 3+ files.

---

## PROGRESS FILE

Read `TS_MIGRATION_PROGRESS.md` in the project root at the start of every iteration. It tracks what is done and what is next. If the file does not exist, create it with the checklist below and begin with Phase 1.

---

## PHASE ORDER

Work through these phases in order. Complete one phase per iteration. If a phase is small, you may combine two phases in one iteration, but ALWAYS run `npm run verify` before stopping.

### Phase 1: Shared Types
- [ ] Create `src/types/index.ts` with shared interfaces:
  - `Court` (id, court_number, court_name, status, etc.)
  - `Block` (id, court_id, block_type, title, starts_at, ends_at, is_recurring, recurrence_rule, recurrence_group_id, cancelled_at, etc.)
  - `Session` (id, court_id, started_at, scheduled_end_at, session_type, participants, etc.)
  - `Member` (id, account_id, display_name, is_primary, status, member_number, plays_180d, etc.)
  - `Account` (id, member_number, account_name, status)
  - `Recurrence` (pattern, frequency, endType, occurrences, endDate, daysOfWeek)
  - `BoardCourt` (the shape returned by get-board for each court)
  - `ApiResponse<T>` (ok, code, message, data, board, serverNow)
- [ ] Base these on the existing JSDoc annotations and the actual data flowing through the app
- [ ] Reference `SmartTimeRangePicker.tsx` for style conventions (it is already TypeScript)
- [ ] Run `npm run verify`

### Phase 2: Utility Layer — `src/lib/`
- [ ] Convert all `.js` files in `src/lib/` to `.ts`
- [ ] This includes: ApiAdapter, apiConfig, runtimeConfig, config, logger, backend commands, etc.
- [ ] Import types from `src/types/` where applicable
- [ ] Update imports in files that reference these modules (may require renaming imports)
- [ ] Run `npm run verify`

### Phase 3: Registration Module — `src/registration/`
- [ ] Convert all `.js`/`.jsx` files in `src/registration/` to `.ts`/`.tsx`
- [ ] Add prop types to all React components (use interface for props)
- [ ] Type hooks (useState, useEffect, useRef, useCallback with proper generics)
- [ ] Type event handlers (React.ChangeEvent, React.MouseEvent, etc.)
- [ ] Run `npm run verify`

### Phase 4: Admin Shared — `src/admin/` root files and `src/admin/handlers/`
- [ ] Convert `.js`/`.jsx` files in `src/admin/` (root level) and `src/admin/handlers/`
- [ ] Type handler functions, operations, and their parameters
- [ ] Run `npm run verify`

### Phase 5: Admin Blocks — `src/admin/blocks/`
- [ ] Convert all `.js`/`.jsx` files in `src/admin/blocks/` (components, hooks, utils)
- [ ] `SmartTimeRangePicker.tsx` is already done — skip it
- [ ] Type the recurrence dropdown, block form, block actions, block timeline, etc.
- [ ] Run `npm run verify`

### Phase 6: Admin Calendar — `src/admin/calendar/`
- [ ] Convert all `.js`/`.jsx` files in `src/admin/calendar/`
- [ ] Type calendar events, views, presenters, modals
- [ ] Run `npm run verify`

### Phase 7: Admin Remaining — `src/admin/analytics/`, `src/admin/system/`, `src/admin/guards/`, etc.
- [ ] Convert any remaining `.js`/`.jsx` files in `src/admin/` subdirectories
- [ ] Run `npm run verify`

### Phase 8: Top-Level App Files
- [ ] Convert `src/App.jsx` → `src/App.tsx`
- [ ] Convert `src/main.jsx` → `src/main.tsx` (update index.html if it references main.jsx)
- [ ] Convert any remaining `.js`/`.jsx` in `src/` root
- [ ] Run `npm run verify`

### Phase 9: Test Files
- [ ] Convert test files in `tests/` from `.js`/`.jsx` to `.ts`/`.tsx`
- [ ] Add types to test utilities, mocks, and fixtures as needed
- [ ] DO NOT change test logic — only add types for compilation
- [ ] Run `npm run verify`

### Phase 10: Cleanup and Verification
- [ ] Search for any remaining `.js`/`.jsx` files in `src/`: `find src/ -name "*.js" -o -name "*.jsx"`
- [ ] Search for any remaining `.js`/`.jsx` files in `tests/`: `find tests/ -name "*.js" -o -name "*.jsx"`
- [ ] Convert any stragglers
- [ ] Verify zero `any` types that could be avoided: `grep -rn ": any" src/ | wc -l` (report count)
- [ ] Run `npm run verify` one final time
- [ ] If ALL phases are checked and `npm run verify` passes: output `<promise>TS_MIGRATION_COMPLETE</promise>`

---

## HOW TO CONVERT A FILE

For each `.js`/`.jsx` → `.ts`/`.tsx` conversion:

1. **Rename** the file (git mv to preserve history):
```bash
   git mv src/lib/logger.js src/lib/logger.ts
```

2. **Add type annotations:**
   - Function parameters and return types
   - React component props (interface + FC or inline)
   - State variables (useState<Type>)
   - Refs (useRef<HTMLInputElement>(null))
   - Event handlers (React.MouseEvent<HTMLButtonElement>)
   - API response shapes

3. **Replace JSDoc type annotations** with inline TypeScript:
```typescript
   // BEFORE (JSDoc):
   /** @param {string} courtId */
   function getCourtName(courtId) { ... }

   // AFTER (TypeScript):
   function getCourtName(courtId: string): string { ... }
```

4. **Fix import paths** — when a file is renamed, other files importing it may need path updates. TypeScript resolves without extensions, so `import X from './logger'` works for both `.ts` and `.js`, but check for explicit `.js` extensions in imports.

5. **Fix any compilation errors** before moving on.

---

## STYLE REFERENCE

Look at `src/components/admin/SmartTimeRangePicker.tsx` for the project's TypeScript style:
- Interfaces for component props
- Inline type annotations on function parameters
- Typed refs: `useRef<HTMLInputElement>(null)`
- Typed state: `useState<string | null>(null)`
- Event types: `React.KeyboardEvent`, `React.MouseEvent`
- Named exports with types

---

## ITERATION CHECKLIST

Every iteration, do this:

1. Read `TS_MIGRATION_PROGRESS.md` — find the next unchecked phase
2. Convert the files for that phase
3. Run `npm run verify`
4. If verify fails, fix the errors
5. Update `TS_MIGRATION_PROGRESS.md` — check off completed items, note any issues
6. Commit the changes:
```bash
   git add -A
   git commit -m "ts-migration: Phase N — [description]"
```
7. If ALL phases are complete and verify passes, output: `<promise>TS_MIGRATION_COMPLETE</promise>`
8. Otherwise, exit and let the next iteration pick up the next phase.

---

## TROUBLESHOOTING

- **Circular imports**: If renaming creates circular dependency errors, restructure the imports (extract shared types to `src/types/`).
- **Test failures**: If a test fails after conversion, the issue is almost always a missing type assertion or an import path change. Do not change test logic.
- **Coverage drops**: The coverage ratchet may need its baseline updated if file renames change the coverage map. Update `config/ratchets/coverage-baseline.json` if needed, but only to match the new file paths — not to lower the threshold.
- **ESLint errors**: The lint ratchet may flag new TypeScript-specific issues. Fix them or update the ratchet config if they are false positives from the migration.
- **Third-party types**: If a library lacks types, install `@types/libraryname` if available. If not, create a minimal `.d.ts` declaration file.
