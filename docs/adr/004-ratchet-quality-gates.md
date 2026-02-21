# ADR-004: Ratchet-Based CI Quality Gates

## Status
Accepted

## Context
The codebase started as a 45K-line JavaScript project with no type checking and minimal linting. Enforcing strict standards immediately would require fixing thousands of issues before any new work could proceed. Conversely, having no enforcement allows quality to erode with each commit.

## Decision
Implement ratchet-based quality gates that enforce monotonic improvement:

- **Lint ratchet** (`eslint-baseline.json`): Captures current warning count. CI fails if warnings increase; improvements are automatically locked in when count decreases.
- **Type ratchet** (`type-baseline.json`): Captures TypeScript error count. New code must not introduce errors; fixing existing errors ratchets the baseline down.
- **Coverage ratchet**: Captures line/branch coverage percentages. CI fails if coverage drops.

All three are enforced by `npm run verify`, which runs: lint:ratchet, type:ratchet, coverage:ratchet, test:fixtures, build, test:e2e.

## Alternatives Considered
- **Strict from day one**: Fix all lint/type errors before proceeding. Rejected — estimated weeks of work with high regression risk, blocking all feature development.
- **No enforcement**: Rely on code review discipline. Rejected — quality erodes under deadline pressure, especially for a solo-dev project without external reviewers.
- **Gradual per-file adoption** (`// @ts-check` per file): Considered for TypeScript migration, but ratchet is more comprehensive — it covers the whole codebase and prevents regression anywhere.

## Consequences
- **Positive**: Quality improves monotonically with every commit. New code is held to current standards. No upfront "stop the world" migration required. Baseline files provide a clear metric of progress.
- **Negative**: Baseline files (`eslint-baseline.json`, `type-baseline.json`) must be committed and can cause merge conflicts. Occasionally a refactor that splits files may change warning counts, requiring baseline updates.
