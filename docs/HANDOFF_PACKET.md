# Handoff Packet

> Everything a new maintainer or contractor needs. Read this page, then follow the links.

## Your Reading Order

| Step | Document | What You Get |
|------|----------|--------------|
| 1 | [Start Here](START_HERE.md) | System overview, quick start, architecture summary |
| 2 | [Onboarding](ONBOARDING.md) | Clone to first PR walkthrough |
| 3 | [Dependency Map](DEPENDENCY_MAP.md) | Module boundaries, import rules, "do not touch" list |
| 4 | [Troubleshooting](TROUBLESHOOTING.md) | Reference — common failures and fixes |

## Must-Read ADRs

| ADR | Topic | Why It Matters |
|-----|-------|----------------|
| [001](adr/001-backend-authoritative-supabase.md) | Backend is source of truth | All state comes from Supabase, not local |
| [002](adr/002-layered-architecture.md) | Layered architecture | Screens → Presenters → Orchestrators → Backend |
| [003](adr/003-normalization-boundary.md) | Normalization boundary | snake_case from API → camelCase in app |
| [004](adr/004-ratchet-quality-gates.md) | Quality ratchets | Lint/type/coverage can improve, never regress |
| [006](adr/006-courtboard-legacy-containment.md) | Courtboard containment | Legacy IIFE scripts — fence, don't rewrite |

ADR-005 (composed hooks) is useful background but not critical for day-one work.

## Operating Rules (Plain English)

**Before every commit:**
- `npm run verify` must pass. No exceptions. It runs lint → types → coverage → fixtures → build → e2e.

**Quality ratchets:**
- Lint errors, type errors, and test coverage each have a baseline number. Your changes can improve them but never make them worse. If a ratchet fails, you either fix it or revert.

**Type safety:**
- No new `any` annotations without a comment explaining why.
- Orchestrators are fully typed. Keep them that way.

**Testing:**
- New handler callbacks → add tests (see [CONTRIBUTING.md](../CONTRIBUTING.md) "Writing Handler Tests")
- New hooks with side effects → add at least one behavioral test
- Use the test harness in `tests/helpers/handlerTestHarness.js`

**Architecture boundaries:**
- Screens call presenters, not orchestrators directly
- Handlers receive slices, not the full AppState
- Courtboard ESM components must not read `window.Tennis` (use windowBridge)
- Direct `app.X` access only in presenters (destructured) and handler wiring

**Git workflow:**
- All work on main (no long-lived branches for this project)
- Commits should be atomic and pass verify independently

## Known Retained Debt

See [review-remediation.md](review-remediation.md) for the full list. Key items:

- **Courtboard IIFE/ESM coexistence** — fenced by ESLint, containment plan in ADR-006, Phases 2-3 deferred
- **App.jsx size** (admin) — ~483 lines, composition root with tab routing
- **domainObjects.js** — 514-line intermediate factory, tested via controller contract
- **Authentication** — deferred; honor-system kiosk model documented in [SECURITY_WP.md](SECURITY_WP.md)

## Reference Documents

| Topic | Location |
|-------|----------|
| Architecture (full) | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| Architecture map | [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) |
| Code conventions | [CODE_CONVENTIONS.md](CODE_CONVENTIONS.md) |
| Contributing rules | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Golden flows | [GOLDEN_FLOWS.md](GOLDEN_FLOWS.md) |
| Error handling | [ERROR_HANDLING.md](ERROR_HANDLING.md) |
| Error contracts | [error-contracts.md](error-contracts.md) |
| Schema | [SCHEMA.md](SCHEMA.md) |
| Security | [SECURITY_WP.md](SECURITY_WP.md) |
| Deployment | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Environment | [ENVIRONMENT.md](ENVIRONMENT.md) |
| Testing | [TESTING.md](TESTING.md) |
| Window globals | [WINDOW_GLOBALS.md](WINDOW_GLOBALS.md) |
| Lint ratchet | [LINT_RATCHET.md](LINT_RATCHET.md) |
