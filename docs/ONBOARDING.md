# Onboarding — Extension Recipes

> Step-by-step recipes for common development tasks. Read [START_HERE.md](START_HERE.md) first for orientation.

## Your First PR

```bash
git clone <repository-url>
cd NOLTCsignup
npm install
npm run dev          # http://localhost:5173
npm run verify       # Must pass before any commit
```

Dev defaults are baked in — no `.env` needed for local dev. The dev server serves all four apps:
- Registration: http://localhost:5173/src/registration/
- Admin: http://localhost:5173/src/admin/
- Courtboard: http://localhost:5173/src/courtboard/
- Mobile: http://localhost:5173/Mobile.html

Use conventional commit prefixes: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for scopes.

## How to Add a New Screen

1. Create the component in `src/registration/screens/` (or `src/admin/screens/`)
2. Create a presenter in `src/registration/router/presenters/` that builds the screen's model from AppState + workflow context — pure function, no hooks
3. Wire the presenter into the route in `src/registration/router/RegistrationRouter.jsx`
4. If the screen needs backend calls, create or extend an orchestrator in `src/registration/orchestration/`
5. Add a smoke test in `tests/unit/smoke/` — render with minimal props, assert key elements are present
6. Run `npm run verify`

**Key rules:**
- Screens receive props from presenters. Screens never import AppState or orchestrators directly.
- Handlers receive named slices, not the full `app` object.

## How to Add a New API Endpoint

1. Add the method to `src/lib/backend/commands/TennisCommands.js` (mutations) or `TennisQueries.js` (reads), or `src/lib/backend/admin/AdminCommands.js` for admin-only endpoints
2. Use `DenialCodes` enum for any denial code comparisons — no raw string literals
3. Validate input with Zod; access validation errors via `result.error.issues` (not `.errors`)
4. Throw `AppError` with the appropriate `ErrorCategories` value for validation/not-found errors
5. Add a unit test proving correct payload shape, success path, and error category
6. Wire into the calling orchestrator; use `normalizeError()` in catch blocks
7. Run `npm run verify`

**Error propagation chain:** Backend response → Command (throws `AppError`) → Orchestrator (catches, `normalizeError()`) → UI (toast/alert). See [ERROR_HANDLING.md](ERROR_HANDLING.md) for the full taxonomy.

## How to Add a CSP Exception

1. Edit `vercel.json` headers block (the `/(.*)`catch-all route)
2. Add the minimum necessary domain to the specific directive (e.g., `connect-src`, `img-src`)
3. Document the reason and the added domain in [CSP_ROLLOUT.md](CSP_ROLLOUT.md)
4. Deploy and verify no console CSP violations in browser DevTools
5. Run `npm run verify`

**Current policy:** `script-src 'self'` enforced on all routes. `style-src 'self' 'unsafe-inline'` retained for React style injection. See [CSP_ROLLOUT.md](CSP_ROLLOUT.md) for full policy.

## How to Add an Admin Hook

1. Create the hook in `src/admin/hooks/` (or the relevant subdirectory like `src/admin/blocks/hooks/`)
2. For complex state, follow the reducer pattern from `src/admin/wetCourts/useWetCourts.js` + `wetCourtsReducer.ts`
3. For simple state, a `useState`-based hook is fine
4. Wire into `buildAdminController` if the hook needs to be accessible across admin tabs
5. Add unit tests — test the hook's state transitions, backend calls, and notification behavior
6. Run `npm run verify`

**Key rules:**
- Admin hooks that own state use `useReducer` for predictable transitions
- Hooks that call backend should handle errors and call `showNotification` on failure
- New hooks exposed via controller need a contract test update in `tests/unit/admin/controller/`

## Quick Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Full verify | `npm run verify` |
| Unit tests only | `npm run test:unit` |
| Unit tests (watch) | `npm run test:unit:watch` |
| E2E tests only | `npm run test:e2e` |
| Lint check | `npx eslint src/` |
| Type check | `npx tsc --noEmit` |
| Build | `npm run build` |

## Further Reading

- [START_HERE.md](START_HERE.md) — System overview and doc map
- [HANDOFF.md](HANDOFF.md) — System guarantees and architecture decisions
- [GOLDEN_FLOWS.md](GOLDEN_FLOWS.md) — Critical user flows to smoke-test
- [CODE_CONVENTIONS.md](CODE_CONVENTIONS.md) — Naming, file structure, patterns
- [TESTING.md](TESTING.md) — Where and how to add tests
