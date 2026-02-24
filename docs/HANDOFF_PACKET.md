# NOLTC Tennis Registration System — Handoff Packet

> System guarantees, architecture decisions, and operating rules for maintainers.

## System Overview

Four applications served from a single Vite-based monorepo:

| App | Path | Purpose |
|-----|------|---------|
| **Registration Kiosk** | `src/registration/` | Member check-in and court assignment (iPad kiosk) |
| **Admin Panel** | `src/admin/` | Operational control — blocks, wet courts, settings, analytics |
| **Courtboard Display** | `src/courtboard/` | Real-time court status for lobby display |
| **Mobile Shell** | `Mobile.html` | 3-iframe layout for mobile device mounting |

All apps share a Supabase backend (separate repo: `noltc-backend/`). Backend is source of truth — frontend is a view layer.

## Verification

```bash
npm run verify
```

Single command. Runs lint ratchet, TypeScript type checking, unit tests with coverage ratchets, fixture validation, production build, and E2E tests. Required before every merge.

## System Guarantees

- **No inline scripts** in any production HTML — all extracted to ES modules
- **No CDN runtime dependencies** — Tailwind bundled via PostCSS
- **`script-src 'self'`** enforced on all routes; `style-src 'self' 'unsafe-inline'` retained for React style injection
- **All service errors** normalized to `AppError` with `ErrorCategories` (VALIDATION, CONFLICT, NOT_FOUND, NETWORK, AUTH, UNKNOWN)
- **All `DenialCodes`** compared via enum — no raw string literals
- **Coverage ratchets** prevent regression — lint warnings, type errors, and test coverage each have a baseline that can improve but never worsen
- **`npm run verify`** is the single required gate before any merge
- **Quality ratchets are one-way** — you can reduce warnings/errors but not add them
- **Admin access defaults to open** for testing; auth-ready seam exists for production lockdown (`VITE_ADMIN_ACCESS_MODE`)

## Key Architectural Decisions

### Error Model
`AppError` with `ErrorCategories`. `mapResponseToCategory()` provides deterministic DenialCode-to-category mapping. `normalizeError()` in orchestrator catch blocks extracts category metadata without altering user-facing messages. See [ERROR_HANDLING.md](ERROR_HANDLING.md).

### State Management
Presenters (pure transforms) → Orchestrators (async coordination) → Handlers (UI callbacks). Screens receive props from presenters; handlers receive named slices, not the full AppState. See [CONTRIBUTING.md](../CONTRIBUTING.md) for slice-access discipline.

### Content Security Policy
`script-src 'self'` enforced globally via `vercel.json`. All inline scripts extracted to ES modules (Stages 1-2). Tailwind built via PostCSS, no CDN (Stage 3). Full enforcement on all routes (Stage 4). See [CSP_ROLLOUT.md](CSP_ROLLOUT.md).

### Courtboard Runtime
Isolated IIFE modules provide display stability for the wall-mounted courtboard. Canonical ESM equivalents exist for testability. The IIFE boundary is fenced by ESLint rules. See [ADR-006](adr/006-courtboard-legacy-containment.md).

### Testing Strategy
Pure-function unit tests for commands, orchestrators, and presenters. Hook-level tests for admin state management. Smoke render tests for all three apps (registration, admin, courtboard). E2E golden-flow tests for critical user paths. See [TESTING.md](TESTING.md).

## Must-Read ADRs

| ADR | Topic | Why It Matters |
|-----|-------|----------------|
| [001](adr/001-backend-authoritative-supabase.md) | Backend is source of truth | All state comes from Supabase, not local |
| [002](adr/002-layered-architecture.md) | Layered architecture | Screens → Presenters → Orchestrators → Backend |
| [003](adr/003-normalization-boundary.md) | Normalization boundary | snake_case from API → camelCase in app |
| [004](adr/004-ratchet-quality-gates.md) | Quality ratchets | Lint/type/coverage can improve, never regress |
| [006](adr/006-courtboard-legacy-containment.md) | Courtboard containment | IIFE/ESM coexistence — fence, test via ESM |

## Operating Rules

**Before every commit:**
- `npm run verify` must pass. No exceptions.

**Quality ratchets:**
- Lint errors, type errors, and test coverage each have a baseline. Your changes can improve them but never make them worse. If a ratchet fails, fix it or revert.

**Type safety:**
- No new `any` annotations without a comment explaining why.
- Orchestrators are fully typed. Keep them that way.

**Testing:**
- New handler callbacks → add tests (see [CONTRIBUTING.md](../CONTRIBUTING.md))
- New hooks with side effects → add at least one behavioral test
- New screens → add a smoke render test in `tests/unit/smoke/`

**Architecture boundaries:**
- Screens call presenters, not orchestrators directly
- Handlers receive slices, not the full AppState
- Courtboard ESM components must not read `window.Tennis` (use `windowBridge`)
- Direct `app.X` access only in presenters (destructured) and handler wiring

**Git workflow:**
- All work on main (no long-lived branches for this project)
- Commits should be atomic and pass verify independently

## Known Issues

All tracked bugs resolved. See [LATENT_BUGS.md](LATENT_BUGS.md):
- 10 fixed
- 1 won't-fix (runtimeConfig dead check — harmless defense-in-depth)
- 1 intent-dependent (title-casing cosmetic — needs operator preference)

## Roadmap / Enhancements (Not Required for Stability)

- Admin authentication: auth-ready seam in place (`AdminAccessMode` config + guard wrapper). Enable at production deployment time. Requires Supabase Auth + Edge Function JWT verification.
- TypeScript `strict: true` migration (ratchet approach)
- Registration state decomposition into React contexts
- Category-aware UX decisions (retry for NETWORK, inline feedback for VALIDATION)
- Registration notification unification (toast vs showAlertMessage)
- Performance instrumentation
- Accessibility audit
- IIFE-to-ESM migration per ADR-006

## Architecture Documentation

| Document | Purpose |
|----------|---------|
| [START_HERE.md](START_HERE.md) | Developer orientation and quick start |
| [ONBOARDING.md](ONBOARDING.md) | Extension recipes — screens, endpoints, CSP, hooks |
| [OPERATIONS.md](OPERATIONS.md) | Production operations — env vars, deployment, monitoring, polling |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | Error taxonomy, propagation, DenialCodes mapping |
| [CSP_ROLLOUT.md](CSP_ROLLOUT.md) | Security policy, enforcement stages, rollback procedure |
| [LATENT_BUGS.md](LATENT_BUGS.md) | Bug tracker — all items resolved |
| [DEPENDENCY_MAP.md](DEPENDENCY_MAP.md) | Module dependency graph and import rules |
| [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) | File/directory map for contractor discoverability |
| [CODE_CONVENTIONS.md](CODE_CONVENTIONS.md) | Naming, file structure, patterns |
| [GOLDEN_FLOWS.md](GOLDEN_FLOWS.md) | Critical user flows and regression checklists |
| [TESTING.md](TESTING.md) | Test locations, frameworks, and how to add tests |
| [SECURITY_WP.md](SECURITY_WP.md) | Threat model and security posture |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment process and environment config |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variables and feature flags |
| [WINDOW_GLOBALS.md](WINDOW_GLOBALS.md) | Courtboard window globals bridge |
| [LINT_RATCHET.md](LINT_RATCHET.md) | Lint ratchet mechanics |
