# Improve Test Coverage for Business Logic  Ralph Loop Prompt

## YOUR ROLE

You are writing targeted tests for uncovered business logic in the NOLTC Tennis Court Registration System. You focus on functions and modules that contain real logic (calculations, transformations, decisions, state management)  not UI rendering or styling. You must leave the codebase green (`npm run verify` passing) at the end of every iteration.

---

## RULES  READ EVERY ITERATION

1. **DO NOT** modify any source code. You are writing tests only.
2. **DO NOT** write trivial tests that just assert a function exists or returns truthy. Every test must verify meaningful behavior  an input produces a specific expected output, an edge case is handled, an error path works correctly.
3. **DO NOT** write tests that duplicate existing test coverage. Check existing test files before writing new ones.
4. **DO NOT** mock everything. If a function is pure (input ’ output, no side effects), test it directly without mocks. Only mock external dependencies (API calls, timers, browser APIs).
5. **DO NOT** chase coverage percentage. Test the important paths, not every getter/setter.
6. **ALWAYS** run `npm run verify` before finishing an iteration.
7. **ALWAYS** update `TEST_COVERAGE_PROGRESS.md` at the end of each iteration.
8. Write **5-15 test cases per iteration**, grouped by the file being tested.
9. Place test files in the mirror location under `tests/unit/` matching the source path.
10. Follow existing test patterns  look at nearby test files for conventions (imports, describe blocks, mock patterns, assertion style).

---

## PROGRESS FILE

Read `TEST_COVERAGE_PROGRESS.md` in the project root at the start of every iteration. If it does not exist, create it on the first iteration starting with Phase 0 (analysis).

---

## PHASE 0: COVERAGE ANALYSIS (First Iteration Only)

On the first iteration:

1. Generate the coverage report:
   ```bash
   npx vitest run --coverage --reporter=json --outputFile=coverage-report.json 2>/dev/null
   ```

2. Identify source files with low function coverage that contain business logic. Focus on files in:
   - `src/registration/orchestration/`  orchestrators
   - `src/registration/router/presenters/`  presenters
   - `src/registration/appHandlers/`  handlers
   - `src/admin/handlers/`  admin handlers
   - `src/admin/blocks/hooks/`  block management hooks
   - `src/admin/blocks/utils/`  block utilities
   - `src/lib/`  core utilities, normalizers, validators
   - `src/tennis/domain/`  domain logic (availability, waitlist)
   - `src/shared/`  shared utilities

3. **Skip these categories** (not worth testing with Ralph):
   - React components that are primarily UI rendering (`.tsx` files that are mostly JSX)
   - Config files
   - Type definition files
   - Files that are just re-exports
   - `src/courtboard/bootstrap/`  legacy, separate concern
   - `src/platform/`  legacy bridge adapters

4. Create a prioritized list in `TEST_COVERAGE_PROGRESS.md`:
   - Priority 1: Uncovered files with complex logic (orchestrators, domain rules)
   - Priority 2: Uncovered utility/helper functions
   - Priority 3: Uncovered presenters and formatters
   - Priority 4: Uncovered hooks with testable logic

5. Commit the progress file and coverage report analysis.

---

## SUBSEQUENT ITERATIONS: WRITE TESTS

Each iteration, pick the next uncovered file from the priority list and write tests for it.

### Before writing tests for a file:

1. **Read the source file**  understand what it does, what the inputs/outputs are, what edge cases exist
2. **Check for existing tests**  `find tests/ -name "*filename*"`  don't duplicate
3. **Identify the testable surface**:
   - Exported functions ’ test directly
   - Hook return values ’ use `renderHook` from `@testing-library/react-hooks`
   - Functions with branching logic ’ test each branch
   - Error handling ’ test error paths
   - Edge cases ’ empty arrays, null values, boundary conditions

### Test quality requirements:

**GOOD test  tests behavior:**
```typescript
describe('expandRecurrenceDates', () => {
  it('returns only selected days of week for weekly pattern', () => {
    const result = expandRecurrenceDates('2026-03-16', {
      pattern: 'weekly',
      frequency: 1,
      daysOfWeek: [1, 3], // Mon, Wed
      endType: 'after',
      occurrences: 4,
      endDate: '',
    });
    expect(result).toHaveLength(4);
    result.forEach(({ date }) => {
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      expect([1, 3]).toContain(dayOfWeek);
    });
  });

  it('respects frequency for every-other-week pattern', () => {
    const result = expandRecurrenceDates('2026-03-16', {
      pattern: 'weekly',
      frequency: 2,
      daysOfWeek: [1],
      endType: 'after',
      occurrences: 3,
      endDate: '',
    });
    // Should be 2 weeks apart
    const dates = result.map(r => new Date(r.date + 'T12:00:00'));
    const diffDays = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(14);
  });
});
```

**BAD test  tests nothing meaningful:**
```typescript
it('should exist', () => {
  expect(expandRecurrenceDates).toBeDefined();
});

it('should return something', () => {
  const result = expandRecurrenceDates('2026-03-16', mockRecurrence);
  expect(result).toBeTruthy();
});
```

**BAD test  over-mocked, tests mock not code:**
```typescript
it('calls the function', () => {
  const spy = vi.spyOn(module, 'expandRecurrenceDates').mockReturnValue([]);
  expandRecurrenceDates('2026-03-16', mockRecurrence);
  expect(spy).toHaveBeenCalled(); // Only proves the mock works
});
```

### What to test in each category:

**Orchestrators:** Test the guard logic  what inputs cause early returns, what triggers error states, what produces successful flow-through. Mock only the backend calls and UI callbacks.

**Presenters:** Test data transformation  given a model state, does the presenter produce the correct view props? These are usually pure functions, easy to test.

**Handlers:** Test state transitions  calling a handler with a given state should produce a predictable new state or side effect.

**Utilities:** Test input ’ output directly. Cover edge cases: empty inputs, null values, boundary values, invalid inputs.

**Domain logic:** Test business rules  availability calculations, waitlist priority, operating hours enforcement. These are the highest-value tests in the codebase.

**Hooks:** Use `renderHook`. Test the returned values and that calling returned functions produces expected state changes.

---

## ITERATION CHECKLIST

1. Read `TEST_COVERAGE_PROGRESS.md`  find the next uncovered file
2. Read the source file to understand it
3. Check for existing tests
4. Write 5-15 meaningful test cases
5. Run `npx vitest run [test-file-path]` to verify tests pass
6. Run `npm run verify` to confirm no regressions
7. Update `TEST_COVERAGE_PROGRESS.md`  mark file as tested, note test count
8. Commit:
   ```bash
   git add -A
   git commit -m "test: add coverage for [filename]  [N] tests"
   ```
9. If ALL Priority 1 and Priority 2 files are covered and `npm run verify` passes: output `<promise>COVERAGE_COMPLETE</promise>`
10. Otherwise, exit and let the next iteration continue.

---

## TROUBLESHOOTING

- **Import errors in test files**: Check how nearby test files import the module. The project may use path aliases or specific import patterns.
- **Hook testing needs providers**: If a hook uses React context, wrap in the appropriate provider. Check existing hook tests for the pattern.
- **Async functions**: Use `async/await` in tests. Don't forget to `await` promises.
- **Timer-dependent code**: Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.
- **Module mock patterns**: Check `tests/unit/` for existing mock patterns. The project likely has shared mock factories.
- **Coverage doesn't improve**: You may be testing an already-covered path. Run coverage for just that file: `npx vitest run --coverage [test-file]` and check the output.
