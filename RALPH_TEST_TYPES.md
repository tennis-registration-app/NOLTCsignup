# Fix TypeScript Errors in Test Files — Ralph Loop Prompt

## YOUR ROLE

You are fixing TypeScript errors in the test files of the NOLTC Tennis Court Registration System. The test files are checked by `tsconfig.test.json` and the current error count is tracked in `config/ratchets/typescript-test-baseline.json`. You fix errors in batches, leaving the codebase green (`npm run verify` passing) after every iteration.

---

## RULES — READ EVERY ITERATION

1. **DO NOT** change any test assertions or test logic. You are adding types only.
2. **DO NOT** change any source code (src/). Only modify files in tests/.
3. **DO NOT** delete or skip any existing test cases.
4. **DO NOT** use `// @ts-ignore` or `// @ts-expect-error` to suppress errors.
5. **DO NOT** weaken any test assertion (e.g., changing `.toBe(5)` to `.toBeTruthy()`).
6. **MINIMIZE** use of `any`. Use proper types, `unknown` with narrowing, or partial mocks with explicit typing. `any` is acceptable ONLY for complex mock objects where full typing would require hundreds of lines of interface satisfaction — and even then, prefer `Partial<InterfaceName> as InterfaceName` over bare `any`.
7. **ALWAYS** run `npm run verify` before finishing an iteration.
8. **ALWAYS** update `TS_TEST_ERRORS_PROGRESS.md` at the end of each iteration.
9. **ALWAYS** update `config/ratchets/typescript-test-baseline.json` with the new error count.
10. Fix **150-250 errors per iteration**. Group by file or by error pattern for efficiency.

---

## PROGRESS FILE

Read `TS_TEST_ERRORS_PROGRESS.md` in the project root at the start of every iteration. If it does not exist, create it with the starting error count and begin.

---

## ERROR CATEGORIES (by frequency)

### Implicit any in mocks (TS7005/7006/7034) — ~1,194 errors
Mock functions and objects without type annotations.

**Fix patterns:**
```typescript
// BEFORE:
const mockFn = vi.fn();
// AFTER:
const mockFn = vi.fn<[], void>();
// or with specific signature:
const mockFn = vi.fn<[id: string], Promise<void>>();

// BEFORE:
const mockBackend = { query: vi.fn() };
// AFTER (partial mock):
const mockBackend = { query: vi.fn() } as unknown as TennisBackend;
// Add comment: // Type assertion: partial mock for testing

// BEFORE:
let result;
// AFTER:
let result: ReturnType<typeof functionBeingTested>;
```

### Nullability violations (TS18046/18047/18048) — ~1,005 errors
Accessing properties on possibly null/undefined values without narrowing.

**Fix patterns:**
```typescript
// BEFORE:
expect(result.data.courts).toHaveLength(12);
// AFTER:
expect(result.data!.courts).toHaveLength(12);
// Non-null assertion is acceptable in tests where the test itself
// verifies the value exists (the expect would fail if it were null)

// BEFORE:
const court = courts.find(c => c.id === '123');
court.name; // TS error: possibly undefined
// AFTER:
const court = courts.find(c => c.id === '123')!;
// Or:
const court = courts.find(c => c.id === '123');
expect(court).toBeDefined();
court!.name;
```

### Type mismatches (TS2322/2339/2345) — ~1,003 errors
Wrong types being passed or properties accessed that don't exist on the type.

**Fix patterns:**
```typescript
// BEFORE:
const mockState = { courts: [], members: [] };
// Missing required properties
// AFTER:
const mockState: Partial<AppState> = { courts: [], members: [] };
// or create with all required fields

// BEFORE:
someFunction({ id: '123' }); // Missing required fields
// AFTER:
someFunction({ id: '123', name: 'Test', status: 'active' } as SomeType);
```

### Shape violations (TS2353) — ~85 errors
Object literals with extra or wrong properties.

**Fix:** Remove extra properties or correct the type annotation.

---

## STRATEGY: FIX BY PATTERN, NOT BY FILE

The most efficient approach is to fix one error pattern across many files in a single iteration, rather than fixing all errors in one file:

**Iteration approach:**
1. Pick the most common unfixed error code (e.g., TS7006 implicit any on parameters)
2. Fix that pattern across 15-30 files
3. This eliminates 150-250 errors in one pass

**Example iteration plan:**
- Iteration 1: Add types to all `vi.fn()` calls across test files (~200 fixes)
- Iteration 2: Add non-null assertions for test value access (~200 fixes)
- Iteration 3: Type mock objects with Partial<> or explicit interfaces (~200 fixes)
- Iteration 4: Fix function parameter types in test helpers (~150 fixes)
- etc.

---

## ACCEPTABLE SHORTCUTS IN TEST FILES

Test files have different standards than production code. These are acceptable:

1. **Non-null assertions (`!`)** — when the test itself validates the value exists
2. **`as Type` casts** — for partial mock objects (prefer `Partial<T>` when possible)
3. **`as unknown as Type`** — for complex mocks where the test only uses a few methods. Always add `// Type assertion: partial mock for testing`
4. **Simplified generics** — `vi.fn<[], void>()` instead of fully typed signatures when the test doesn't care about the mock's parameter types

These are NOT acceptable:
1. **Bare `any` on function parameters** — add proper types
2. **`// @ts-ignore`** — fix the actual error
3. **Changing assertions** — never weaken a test
4. **Removing test cases** — never delete tests to fix type errors

---

## HOW TO CHECK ERROR COUNT

```bash
npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep "error TS" | wc -l
```

After fixing, update the baseline:
```bash
# Get new count
npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep "error TS" | wc -l
# Update config/ratchets/typescript-test-baseline.json with new number
```

---

## ITERATION CHECKLIST

1. Read `TS_TEST_ERRORS_PROGRESS.md`
2. Get current count: `npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep "error TS" | wc -l`
3. Pick an error pattern to target this iteration
4. Fix 150-250 errors across test files
5. Update `config/ratchets/typescript-test-baseline.json` with the new count
6. Run `npm run verify` — must pass
7. Update `TS_TEST_ERRORS_PROGRESS.md`
8. Commit:
   ```bash
   git add -A
   git commit -m "test-types: reduce errors from N to M — [pattern description]"
   ```
9. If error count reaches **0** and `npm run verify` passes: output `<promise>TEST_TYPES_COMPLETE</promise>`
10. Otherwise, exit and let the next iteration continue.

---

## TROUBLESHOOTING

- **Fixing one error creates more**: You likely changed a shared test utility type. Fix the cascade in the same iteration.
- **Mock typing is complex**: Use `Partial<Interface>` for objects with many required fields. The test only needs the fields it actually uses.
- **Cannot determine the right type**: Look at the source function's signature in src/ — the test parameter types should match.
- **renderHook typing**: `renderHook(() => useMyHook())` — the generic is usually inferred. If not: `renderHook<ReturnType, Props>(() => useMyHook())`.
- **vi.fn() typing**: For simple mocks, `vi.fn()` is fine if the return type is never used. For mocks whose return value matters, add the generic: `vi.fn<[param: string], ReturnType>()`.
- **Test helper factories**: If a `createMockX()` helper is used across many files, type the helper once — that fixes all call sites.
