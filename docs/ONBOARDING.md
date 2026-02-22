# Your First PR

> Step-by-step guide from clone to merged PR.

## 1. Install & Run

```bash
git clone <repository-url>
cd NOLTCsignup
npm install
npm run dev          # http://localhost:5173
```

Dev defaults are baked in — no `.env` needed for local dev. The dev server serves all four apps:
- Registration: http://localhost:5173/src/registration/
- Courtboard: http://localhost:5173/src/courtboard/
- Admin: http://localhost:5173/src/admin/
- Mobile: http://localhost:5173/Mobile.html

## 2. Verify Baseline

Before touching any code, confirm your checkout is green:

```bash
npm run verify
```

This runs five gates in order:

| Gate | Command | What it checks |
|------|---------|----------------|
| Lint ratchet | `npm run lint:ratchet` | ESLint — 0 errors, warnings must not increase |
| Type ratchet | `npm run type:ratchet` | TypeScript — error count must not increase |
| Coverage ratchet | `npm run coverage:ratchet` | Unit tests + coverage — must not decrease |
| Fixture tests | `npm run test:fixtures` | API contract sentinel tests |
| Build | `npm run build` | Vite production build |
| E2E | `npm run test:e2e` | Playwright end-to-end (all must pass) |

If verify fails on a clean checkout, something is wrong with your environment — check Node version (18+) and npm (9+).

## 3. Create a Branch

```bash
git checkout -b feat/your-feature-name
```

Use conventional commit prefixes: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for scopes.

## 4. Make Your Change

Key rules:
- **No file over 500 lines.** Extract to separate modules if needed.
- **Run `npm run verify` after each logical change.** Do not batch.
- **Tests go in `tests/unit/`** mirroring source structure. E2E tests go in `e2e/`.
- **Lint/type ratchets are one-way.** You can reduce warnings/errors but not add them.

Useful watch-mode commands while developing:

```bash
npm run test:unit:watch     # Vitest watch mode
npx playwright test <file>  # Run specific E2E test
```

## 5. Understand the Architecture

Before making changes, know where you are:

| Area | Entry point | State management |
|------|-------------|-----------------|
| Registration | `src/registration/App.jsx` | `useRegistrationAppState` → presenters → screens |
| Admin | `src/admin/App.jsx` | `buildAdminController` + local hooks |
| Courtboard | `src/courtboard/main.jsx` | Direct API queries + window globals (see [ADR-006](adr/006-courtboard-legacy-containment.md)) |

Registration code follows strict slice discipline — see [CONTRIBUTING.md § Slice-Access Discipline](../CONTRIBUTING.md). Handlers receive named slices, never the full `app` object.

## 6. Run Verify & Commit

```bash
npm run verify                    # Must pass
git add -A
git commit -m "feat(scope): short description"
```

## 7. Push & Open PR

```bash
git push -u origin feat/your-feature-name
gh pr create --title "feat(scope): short description" --body "## Summary
- What changed and why

## Test plan
- [ ] npm run verify passes
- [ ] Manual smoke test of affected flow"
```

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

- [docs/START_HERE.md](START_HERE.md) — System overview and doc map
- [docs/GOLDEN_FLOWS.md](GOLDEN_FLOWS.md) — Critical user flows to smoke-test
- [docs/CODE_CONVENTIONS.md](CODE_CONVENTIONS.md) — Naming, file structure, patterns
- [docs/TESTING.md](TESTING.md) — Where and how to add tests
