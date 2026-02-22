# Start Here

> Single entry point for the NOLTC Tennis Court Registration System. If you're new, read this first.

## What This System Is

Court registration system for the New Orleans Lawn Tennis Club — 12 courts, ~2,500 members. Four sub-applications in this repo, all sharing a Supabase backend (separate repo: `noltc-backend/`).

| App | Path | Purpose | Primary Use |
|-----|------|---------|-------------|
| Registration | `src/registration/` | Member check-in and court assignment | iPad kiosk at club entrance |
| Courtboard | `src/courtboard/` | Real-time court status display | Wall-mounted display in clubhouse |
| Admin | `src/admin/` | Settings, blocks, analytics, calendar | Staff management interface |
| Mobile | `Mobile.html` | Location-verified registration | Member smartphones (QR-based, iframe shell) |

**Identity model:** Honor-system — no authentication. Admin access via URL path. Supabase RLS provides backend access control. See [docs/SECURITY_WP.md](SECURITY_WP.md) for threat model.

**Design principles:** Backend-authoritative (frontend is a view layer), all mutations through Edge Functions, realtime state via Supabase subscriptions. See [ARCHITECTURE.md](../ARCHITECTURE.md) for full details.

## Quick Start

```bash
git clone <repository-url>
cd NOLTCsignup
npm install
cp .env.example .env.local   # Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                   # http://localhost:5173
```

Dev-only defaults exist for local setup (anon keys, not secrets). See [docs/ENVIRONMENT.md](ENVIRONMENT.md) for all variables and feature flags.

**Verification gate — run before every commit:**

```bash
npm run verify
```

This runs: lint ratchet → type ratchet → unit tests + coverage → fixture tests → production build → E2E tests. All must pass. See [docs/TESTING.md](TESTING.md) for test locations and how to add tests.

## Where Things Live

| I need to... | Start here |
|--------------|------------|
| Understand the system | [ARCHITECTURE.md](../ARCHITECTURE.md) (high-level design) |
| Find a specific file | [docs/ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) (contractor discoverability) |
| Understand module system + entry points | [ARCHITECTURE.md](../ARCHITECTURE.md) (includes ESM, adapters, boot chain) |
| See the database schema | [docs/SCHEMA.md](SCHEMA.md) |
| Understand window globals (courtboard) | [docs/WINDOW_GLOBALS.md](WINDOW_GLOBALS.md) |
| See module boundaries + import rules | [docs/DEPENDENCY_MAP.md](DEPENDENCY_MAP.md) |
| Read design rationale | [docs/adr/](adr/) (Architecture Decision Records) |

## Development Rules

| Rule | Doc |
|------|-----|
| Code style, naming, file conventions | [docs/CODE_CONVENTIONS.md](CODE_CONVENTIONS.md) |
| Contributing workflow, AppState governance | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Lint ratchet (warnings must not increase) | [docs/LINT_RATCHET.md](LINT_RATCHET.md) |
| Type checking baseline | [docs/TYPECHECK.md](TYPECHECK.md) |

## Critical User Flows

The golden flows that must always work — used as both manual regression checklists and Playwright test inputs:

- [docs/GOLDEN_FLOWS.md](GOLDEN_FLOWS.md) — Registration happy path, waitlist → assignment, admin block scheduling, mobile registration, court change

## Testing

| Type | Framework | Command | Location |
|------|-----------|---------|----------|
| Unit | Vitest | `npm run test:unit` | `tests/unit/` |
| E2E | Playwright | `npm run test:e2e` | `e2e/` |
| Fixtures | Vitest | `npm run test:fixtures` | `tests/unit/` (API contract sentinels) |

Full details: [docs/TESTING.md](TESTING.md), [docs/API_TESTING.md](API_TESTING.md), [docs/verification-checklist.md](verification-checklist.md).

## Operations

| Topic | Doc |
|-------|-----|
| Deployment | [docs/DEPLOYMENT.md](DEPLOYMENT.md) |
| Environment config | [docs/ENVIRONMENT.md](ENVIRONMENT.md) |
| Troubleshooting FAQ | [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Operations runbook | [docs/RUNBOOK.md](RUNBOOK.md) |
| Error handling patterns | [docs/ERROR_HANDLING.md](ERROR_HANDLING.md), [docs/error-contracts.md](error-contracts.md) |

## Additional References

- [docs/SECURITY_WP.md](SECURITY_WP.md) — Security threat model and posture
- [docs/LEGACY_MIGRATION.md](LEGACY_MIGRATION.md) — Legacy IIFE → ESM migration status
- [docs/review-remediation.md](review-remediation.md) — Resolved, deferred, and retained items from architectural reviews
