# ADR-005: No State Management Library — Composed Hooks with AppState Contract

## Status
Accepted

## Context
The registration app assembles state from 6 sub-hooks into a 33-key AppState object consumed by all screens. As the state surface grew, the question arose: should the project adopt Redux, Zustand, or another state management library?

## Decision
Use composed `useState`/`useCallback` hooks assembled by `buildRegistrationReturn.ts` rather than an external state library. The `AppState` interface in `appTypes.ts` is the formal contract, frozen by a contract test that asserts all 33 keys and their types. Presenters decompose AppState into per-screen prop sets, avoiding the need for selectors or context splitting.

Key governance rules (see CONTRIBUTING.md):
- No new top-level keys — add fields to existing sub-interfaces
- Contract test must pass after any AppState change
- Presenters handle per-screen decomposition (not selectors or context)

## Alternatives Considered
- **Redux Toolkit**: Proven at scale, but adds significant boilerplate (slices, reducers, selectors, dispatch) for a solo-dev project. The composed-hooks approach provides equivalent structure with less ceremony.
- **Zustand**: Simpler than Redux, but adds an external dependency for state that React hooks already handle. The subscription model doesn't provide clear advantages over the current presenter pattern.
- **React Context per domain slice**: Evaluated 6 times during development. Rejected each time because presenters already solve the consumption problem (transforming AppState into screen-specific props) without restructuring access paths or introducing re-render boundaries.

## Consequences
- **Positive**: No external dependency. Familiar React patterns — any React developer can read the code. Presenters provide clean per-screen interfaces. Contract test prevents uncontrolled growth.
- **Negative**: AppState God Object acknowledged as a scaling concern. Handler dependency arrays can be long (8-12 items). Adding new state requires threading through `buildRegistrationReturn`. Revisit this decision if the team exceeds 3 concurrent developers or AppState exceeds ~50 keys.
