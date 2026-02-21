# Architectural Review Remediation Status

Last updated: February 2026

Based on two independent architectural reviews (Claude Code Opus) evaluating the codebase for maintenance takeover, team extension, and professional standards.

## Resolved

### Type Safety
- **`any` in appTypes.ts:** 28 -> 0. All replaced with domain interfaces (22 created).
- **`Function` in appTypes.ts:** 146 -> 0. All replaced with typed signatures using `Setter<T>`/`Updater<T>` utilities.
- **`as any` casts in orchestrators:** 9 -> 0. Replaced with proper type extensions and null guards.
- **`@ts-expect-error` in presenters:** 1 -> 0. Replaced with named `CourtDataMutable` type.
- **TypeScript interface files:** 15 files converted (appTypes, 5 orchestrators, 5 presenters, buildRegistrationReturn, barrels).
- **checkJs enabled:** 449 type errors resolved, CI-enforced via type ratchet.

### Boundary Enforcement
- **ESLint boundary rules:** 3 -> 7 mechanically-enforced rules covering screen/presenter/orchestrator/handler/window boundaries.
- **Global bans:** localStorage, alert, confirm, window.Tennis outside platform layer.
- **Exemption policy:** Documented in CONTRIBUTING.md — requires justification, deletion condition, minimal scope.
- **Docs updated:** "Verify with rg" replaced with "ESLint-enforced" throughout.

### Legacy Bridge
- **Registration/admin apps:** Fully migrated to direct ESM imports. Zero windowBridge accessor calls. Entry points halved (registration main.jsx 52->22 lines, admin 53->27 lines).
- **windowBridge.js:** 20 -> 11 exports. 10 serve courtboard only, 1 (isMobileView) cross-app.

### Admin Convergence
- **Callbacks extracted:** 8 inline useCallbacks -> `useAdminHandlers` hook, contract-tested.
- **Presenters added:** 4 presenters (calendar, status, blocking, waitlist) with equivalence tests.
- **3 thin sections** (Analytics 12 lines, History 5, System 6) assessed — too thin for presenter pattern.

### AppState Governance
- **Contract test:** Pre-existing test freezes all 33 top-level keys (useRegistrationAppState.test.js).
- **Governance rule:** CONTRIBUTING.md — no new top-level keys, add to existing sub-interfaces.
- **Logical groupings:** Documented in appTypes.ts (8 groups: UI, Domain Slices, Derived, Helpers, Services, Config, Orchestrators, Debug).

### Quality Gates
- **Coverage ratchet:** Added, CI-enforced (follows lint/type ratchet pattern).
- **Fixture validation:** Wired into CI verify chain.
- **Unit tests:** 994 -> 1048.

### Documentation
- **ADRs:** 5 initial Architecture Decision Records (backend-authoritative, layered architecture, normalization boundary, ratchet gates, no state management library).
- **Schema documentation:** docs/SCHEMA.md (inferred from normalize layer — backend lives in separate repo).
- **Architecture docs:** Updated throughout to reflect enforcement status.

## Deferred (With Rationale)

### Admin Authentication
- **Status:** No authentication on admin panel. Anyone with URL access has full control.
- **Rationale:** System runs on club premises behind physical access control. Acceptable for kiosk deployment. SECURITY_WP.md documents this as known risk.
- **Gate:** Must be implemented before any public-network deployment.

### AppState Context Decomposition
- **Status:** Evaluated 6 times across reviews. Rejected each time.
- **Rationale:** Presenters already decompose AppState per-screen. Context migration would change access paths (`app.x` -> `app.ui.x`) across every consumer with no behavioral benefit at current team size.
- **Gate:** Revisit if team exceeds 3 developers and merge conflicts in buildRegistrationReturn.ts become frequent.
- **ADR:** 005-composed-hooks-no-state-library.md

### State Management Library (Redux/Zustand)
- **Status:** Not adopted.
- **Rationale:** Composed hooks work at current scale. External dependency adds complexity without clear payoff for solo/small team.
- **ADR:** 005-composed-hooks-no-state-library.md

### `strict: true` in tsconfig
- **Status:** 6,696 errors (3,657 are JSX noise from missing type declarations).
- **Rationale:** High churn, moderate incremental value over checkJs + JSDoc which is already at 0 errors.
- **Gate:** Consider when converting more files to .tsx or adopting a JSX type declaration strategy.

### 40% Test Coverage Target
- **Status:** ~20% line coverage, enforced by ratchet (cannot regress).
- **Rationale:** Testing strategy prioritizes orchestrator unit tests + E2E user flows over component-level coverage. Coverage ratchet locks in improvements.
- **Gate:** No immediate need. Handler/hook testing would be next if coverage uplift is pursued.

## Retained Technical Debt

### Courtboard Legacy Bridge (IIFE/ESM Coexistence)
- **Status:** 4 courtboard plain `<script>` files read `window.Tennis.*` directly. All 9 `attachLegacy*.js` files retained for courtboard. Two module systems coexist.
- **Why it can't be removed now:** Courtboard plain scripts cannot use ESM imports. Requires bundler adoption for courtboard app.
- **Mitigation:** ESLint boundary rules prevent new window.Tennis access outside platform/. Bridge is documented in registerGlobals.js and windowBridge.js.
- **Deletion condition:** Convert courtboard to Vite-bundled app (all scripts become ESM modules).

### Admin App.jsx Size (484 lines)
- **Status:** Reduced from 510 but still large. 2 useEffects, 1 useMemo, 8 useState remain.
- **Why:** Composition root with tab routing, provider nesting, and state initialization. Further extraction has diminishing returns — the handlers and presenters are already extracted.
- **Mitigation:** buildAdminController + useAdminHandlers + 4 presenters handle the complex logic.

### domainObjects.js (514 lines)
- **Status:** Intermediate factory pattern bundling many concerns.
- **Why deferred:** Works correctly, tested via controller contract test. Splitting would be churn without behavioral benefit.
- **Deletion condition:** If admin convergence continues to Phase 2, domain objects can be split per tab domain.
