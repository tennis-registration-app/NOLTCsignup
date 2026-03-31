# Reduce `as unknown as` Type Casts — Ralph Loop Prompt

## YOUR ROLE

You are auditing and reducing the `as unknown as` type casts in the NOLTC Tennis Court Registration System. These casts bypass TypeScript's type checker entirely. Your goal is to fix the underlying type mismatches so the casts are unnecessary, or where they truly are necessary, add a comment explaining why.

You must leave the codebase green (`npm run verify` passing) at the end of every iteration.

---

## RULES — READ EVERY ITERATION

1. **DO NOT** change any application logic, behavior, or styling. Fix types only.
2. **DO NOT** use `any` to replace `as unknown as` — that's worse, not better.
3. **DO NOT** use `// @ts-ignore` or `// @ts-expect-error`.
4. **DO NOT** remove a cast if you cannot verify the types actually match at runtime.
5. **ALWAYS** run `npm run verify` before finishing an iteration.
6. **ALWAYS** update `TS_CASTS_PROGRESS.md` at the end of each iteration.
7. Fix **5-10 casts per iteration**. Verify each one carefully.
8. **PREFER** fixing the type definition (interface/type) so the cast becomes unnecessary, over adding a comment to justify the cast.

---

## PROGRESS FILE

Read `TS_CASTS_PROGRESS.md` in the project root at the start of every iteration. If it does not exist, create it on the first iteration.

---

## FIRST ITERATION: AUDIT

1. Find all `as unknown as` occurrences:
   ```bash
   grep -rn "as unknown as" src/ | grep -v node_modules
   ```
2. Count them and group by file
3. Categorize each cast into one of these buckets:
   - **A: Fixable** — the types can be corrected so the cast is unnecessary
   - **B: Structural** — the cast exists because two module boundaries define the same concept with slightly different types (e.g., hook return vs. interface definition). Fix by aligning the types.
   - **C: Necessary** — the cast is genuinely needed (e.g., generic type narrowing, test mocking). Add a `// Type assertion: [reason]` comment.
4. Record the audit in `TS_CASTS_PROGRESS.md`
5. Begin fixing the first batch of 5-10 casts from the highest-concentration files:
   - `src/registration/appHandlers/useRegistrationAppState.ts` (~10 casts)
   - `src/registration/appHandlers/buildHandlerDeps.ts` (~9 casts)
   - `src/registration/appHandlers/state/buildRegistrationReturn.ts`
6. Commit and push

---

## SUBSEQUENT ITERATIONS

1. Read `TS_CASTS_PROGRESS.md`
2. Get current count: `grep -rn "as unknown as" src/ | grep -v node_modules | wc -l`
3. Fix the next 5-10 casts
4. Run `npm run verify`
5. Update `TS_CASTS_PROGRESS.md`
6. Commit: `git add -A && git commit -m "types: reduce as-unknown-as casts from N to M — [files]"`
7. If count reaches **0** (or all remaining are annotated as Necessary) and `npm run verify` passes: output `<promise>CASTS_COMPLETE</promise>`

---

## HOW TO FIX A CAST

### Pattern 1: Hook return type mismatch

**Problem:**
```typescript
const result = useSomeHook() as unknown as ExpectedType;
```

**Fix:** Update the hook's return type to match `ExpectedType`, or update `ExpectedType` to match what the hook actually returns. Check which one is correct by looking at the runtime data.

### Pattern 2: Module composition mismatch

**Problem:**
```typescript
// useRegistrationAppState.ts
const derived = useDerived(state);
return {
  someField: derived.someField as unknown as FieldType,
};
```

**Fix:** Check what `useDerived` actually returns for `someField`. Update either the return type of `useDerived` or the `FieldType` definition so they align.

### Pattern 3: Object assembly with partial types

**Problem:**
```typescript
const deps = {
  state: hookReturn.state as unknown as StateType,
  actions: hookReturn.actions as unknown as ActionsType,
};
```

**Fix:** Define a proper intermediate type that matches what `hookReturn` actually contains, then use that type. Or update `StateType`/`ActionsType` to match the hook's output.

### Pattern 4: Genuinely necessary cast

**Problem:**
```typescript
// Test file mocking
const mockBackend = { query: vi.fn() } as unknown as TennisBackend;
```

**Fix:** This is acceptable in test files. Add a comment: `// Type assertion: partial mock for testing`. Do NOT waste time making test mocks fully type-safe if the mock is intentionally partial.

### Pattern 5: Generic type narrowing

**Problem:**
```typescript
const data = response.data as unknown as SpecificResponseType;
```

**Fix:** Make the API response generic: `ApiResponse<SpecificResponseType>` and type the function call properly so inference works.

---

## PRIORITY ORDER

1. `src/registration/appHandlers/useRegistrationAppState.ts` (~10 casts)
2. `src/registration/appHandlers/buildHandlerDeps.ts` (~9 casts)
3. `src/registration/appHandlers/state/buildRegistrationReturn.ts`
4. `src/admin/` files with casts
5. Any remaining files
6. Test files (lowest priority — partial mocks are acceptable)

---

## WHAT NOT TO CHANGE

- Application logic or behavior
- Test assertions
- The composed hook architecture (don't restructure modules to fix types)
- The appTypes.ts type definitions unless the change is clearly correct
- Any backend or Edge Functions

---

## TROUBLESHOOTING

- **Removing a cast causes a type error elsewhere**: The cast was hiding a real mismatch. Fix the mismatch at the source type, not at the usage site.
- **Two interfaces describe the same thing differently**: Consolidate to one source of truth in `src/types/` and update both consumers.
- **Generic type won't infer**: Explicitly specify the type parameter rather than casting.
- **Cast is in a complex composition chain**: Trace from the bottom (where data is created) to the top (where it's consumed) to find where the type diverges. Fix at the divergence point.
