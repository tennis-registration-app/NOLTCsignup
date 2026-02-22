# Troubleshooting

> Common issues and how to fix them.

## Ratchet Failures

### Lint ratchet failed

- **Means:** New lint errors exceed baseline, or warning count increased.
- **Fix:** Run `npx eslint src/ --quiet` to see errors, then fix them.
- If you _reduced_ warnings but the ratchet still fails, update the baseline: `npm run lint:ratchet -- --update`

### Type ratchet failed

- **Means:** New TypeScript errors introduced.
- **Fix:** Run `npx tsc --noEmit` to see all errors and fix them.

### Coverage ratchet failed

- **Means:** Line/branch coverage dropped below the baseline.
- **Fix:** Add tests for uncovered code, or revert the change that reduced coverage.
- To compare: `cat coverage-baseline.json` then `npx vitest run --coverage`

## E2E / Playwright Failures

### Tests pass locally but fail in CI

- Check headless vs headed mode differences.
- Check viewport size — CI uses 1280x720.
- Ensure `e2e/fixtures/` mock data matches current API response shapes.

### Flaky selectors

- Prefer `data-testid` attributes over CSS class selectors.
- Use `waitForSelector` or Playwright auto-waiting before assertions.

### Flaky test in full suite but passes in isolation

- Known issue with test isolation under coverage instrumentation.
- Run the specific test file: `npx vitest run tests/unit/path/to/file.test.js`
- If it passes alone, it's a test-ordering issue — not your fault. Re-run verify.

## Supabase / Environment

### "Missing SUPABASE_URL" or similar

- Check `.env.local` exists with valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Dev defaults are built in — this usually only happens on production builds.
- See [docs/ENVIRONMENT.md](ENVIRONMENT.md) for all variables.

### Edge Functions not responding

- Check Supabase dashboard for function status and logs.
- Verify `VITE_SUPABASE_ANON_KEY` matches the project.
- Check network tab — look for CORS errors or 5xx responses.

## Vite / Build

### Build fails with module resolution error

- Run `npm install` — a dependency may be missing.
- Check import paths — project uses `@lib` alias (mapped in `vite.config.js`).

### Hot reload not working

- Check terminal for Vite errors.
- Courtboard IIFE scripts (`mobile-bridge.js`, `mobile-fallback-bar.js`) don't hot-reload — refresh manually.
- Changes to `attachLegacy*.js` adapters require full page reload.

## Handler Tests

### renderHandlerHook fails with "Invalid hook call"

- Ensure the hook is called inside the render function, not outside.
- Check that React is not duplicated in `node_modules` (`npm ls react`).

### Mock not being called

- Verify `mocks.X` is the same reference as `deps.nested.X` (the test harness guarantees this).
- Check that the handler's guard condition isn't preventing execution.
- Use `vi.fn()` and check `.mock.calls` to see if it was invoked with unexpected args.

## Error Patterns

For deeper error handling architecture, see:
- [docs/ERROR_HANDLING.md](ERROR_HANDLING.md) — Error propagation flow (Commands → API → Services → Orchestrators → UI)
- [docs/error-contracts.md](error-contracts.md) — `AppError` shape and category definitions
- [docs/RUNBOOK.md](RUNBOOK.md) — Operational troubleshooting (deployment, kiosk hardware, Supabase)
