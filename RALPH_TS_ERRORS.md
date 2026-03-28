# Fix Baselined TypeScript Errors  Ralph Loop Prompt

## YOUR ROLE

You are fixing the 120 baselined TypeScript errors in the NOLTC Tennis Court Registration System. These errors are tracked in `config/ratchets/typescript-baseline.json`. Your goal is to fix them properly with correct types  not suppress them with `any` or `// @ts-ignore`.

You must leave the codebase green (`npm run verify` passing) at the end of every iteration.

---

## RULES  READ EVERY ITERATION

1. **DO NOT** change any application logic, behavior, or styling. Fix types only.
2. **DO NOT** use `any` type to suppress errors. Use proper types, `unknown` with narrowing, or correct the type definitions.
3. **DO NOT** use `// @ts-ignore` or `// @ts-expect-error` to suppress errors.
4. **DO NOT** add new dependencies.
5. **DO NOT** change test assertions or test logic  only fix type annotations in test files if needed.
6. **ALWAYS** run `npm run verify` before finishing an iteration.
7. **ALWAYS** update `TS_ERRORS_PROGRESS.md` at the end of each iteration.
8. **ALWAYS** update `config/ratchets/typescript-baseline.json` after fixing errors to reflect the lower count.
9. Fix errors in batches of **10-20 per iteration**. Do not try to fix all 120 at once.
10. **PREFER** fixing the root cause over fixing the symptom. If a type definition is wrong or incomplete, fix the definition rather than casting at each usage site.

---

## PROGRESS FILE

Read `TS_ERRORS_PROGRESS.md` in the project root at the start of every iteration. If it does not exist, create it with the starting error count and begin.

---

## ERROR CATEGORIES

The baselined errors fall into these categories. Fix them in this priority order:

### Priority 1: TS2339  "Property does not exist on type" (91 errors)
These are the most dangerous. They mean code is accessing properties that TypeScript cannot verify exist. Common causes:
- Object typed as `{}` or too-narrow interface that's missing properties
- Response data not properly typed after API calls
- State objects with optional properties not reflected in the type

**Fix approach:** Find the type definition and add the missing property. If the object comes from an API response, update the corresponding interface in `src/types/` or `src/types/appTypes.ts`.

### Priority 2: TS18046  "is of type 'unknown'" (10 errors)
Code using a value typed as `unknown` without narrowing first.

**Fix approach:** Add type narrowing before usage:
```typescript
if (typeof value === 'string') { /* use as string */ }
if (value instanceof Error) { /* use as Error */ }
if (value && typeof value === 'object' && 'property' in value) { /* narrow */ }
```

### Priority 3: TS2345  "Argument type mismatch" (11 errors)
A function is being called with an argument whose type doesn't match the parameter type.

**Fix approach:** Either fix the argument type, fix the parameter type, or add a proper type guard. Often the parameter type is correct and the argument needs a type assertion or the calling code needs to construct the right shape.

### Remaining errors (~8 errors of other types)
Fix these last. Read the specific error message and apply the appropriate fix.

---

## HOW TO FIND THE ERRORS

Run the TypeScript compiler to see all current errors:

```bash
npx tsc --noEmit 2>&1 | head -200
```

Or check the baseline file for the current count:

```bash
cat config/ratchets/typescript-baseline.json
```

The baseline file tracks the error count. After fixing errors, update it:

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Then update the baseline JSON with the new count.

---

## HOW TO FIX ERRORS SAFELY

For each error:

1. **Read the error message**  it tells you the file, line, and what's wrong
2. **Find the root type**  don't just cast at the usage site. If `block.recurrenceGroupId` doesn't exist on type `Block`, add it to the `Block` interface
3. **Check if the property actually exists at runtime**  look at how the object is created or received from the API. If the property is real, the type is wrong. If the property shouldn't exist, the code is wrong.
4. **Fix the type definition**  update interfaces in `src/types/index.ts`, `src/types/appTypes.ts`, or co-located in the relevant file
5. **Verify the fix**  run `npx tsc --noEmit` to confirm the error count decreased

---

## ITERATION CHECKLIST

Every iteration, do this:

1. Read `TS_ERRORS_PROGRESS.md`
2. Run `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l` to get current count
3. Pick the next 10-20 errors to fix (group by file or by error type for efficiency)
4. Fix them with proper types
5. Run `npx tsc --noEmit` to verify error count decreased
6. Update `config/ratchets/typescript-baseline.json` with the new count
7. Run `npm run verify` to confirm everything passes
8. Update `TS_ERRORS_PROGRESS.md` with what was fixed and the new count
9. Commit:
   ```bash
   git add -A
   git commit -m "fix(types): reduce TS errors from N to M  [description]"
   ```
10. If error count reaches **0** and `npm run verify` passes, output: `<promise>TS_ERRORS_COMPLETE</promise>`
11. Otherwise, exit and let the next iteration continue.

---

## IMPORTANT: DO NOT BREAK THE RATCHET

The typescript ratchet in `npm run verify` checks that the error count does not INCREASE. After fixing errors, you MUST update the baseline to the new lower count. If you update the baseline but introduce new errors elsewhere, verify will fail.

The safe workflow:
1. Fix errors ’ count goes down
2. Update baseline to new count
3. Run verify  if it passes, the ratchet is satisfied
4. If verify fails, you introduced new errors  fix them before committing

---

## WHEN TO MODIFY TYPE DEFINITIONS

- `src/types/index.ts`  shared types used across 3+ files
- `src/types/appTypes.ts`  AppState, orchestrator deps, domain models
- Co-located in the file  types used only in that file

When adding properties to shared interfaces, check that all code constructing that type includes the new property (or make it optional with `?`).

---

## TROUBLESHOOTING

- **Fixing one error creates new ones**: You changed a type that other code depends on. Fix the cascade in the same iteration.
- **Unsure if a property is real**: Search for where the object is created (`grep -rn "propertyName" src/`). If it's set somewhere, the type should include it.
- **Generic type issues**: Prefer explicit type parameters over inference when inference fails: `useState<string | null>(null)` instead of `useState(null)`.
- **Third-party types**: If an error is in a library's types, a thin wrapper with correct types is acceptable. Do not modify node_modules.
- **Test file errors**: These are lower priority. Fix source code errors first, then test files.
