# Admin Architecture Notes

## Why Admin Differs from Registration

Registration went through two full architectural passes: presenter extraction,
handler scoping, ESM migration, and comprehensive test coverage. The admin app
predates that work.

## Current State

- `App.jsx` (615 lines): 24 inline `useMemo`/`useCallback` blocks
- `buildAdminController.js` (234 lines): Pure function scaffolded to replace
  the inline hooks. Has 30 contract tests via `CONTROLLER_KEYS`. **Not yet wired in.**
- No presenter layer yet

## Convergence Path (When Prioritized)

1. Wire `buildAdminController` into `App.jsx` (replace 24 inline hooks with single call)
2. Extract admin presenters for each panel/section
3. Slim `App.jsx` to thin shell matching registration's pattern

This is not urgent. The admin app works correctly and has test coverage.
Registration's architecture is the target pattern. The controller is already
built — only the wiring step remains.

## Two Generations of Architecture

The codebase contains two generations of architecture. Registration reflects
deliberate, pattern-driven design with full presenter coverage. Admin reflects
earlier exploratory work. The task is convergence, not reinvention.
