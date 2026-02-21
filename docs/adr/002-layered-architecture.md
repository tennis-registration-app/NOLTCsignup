# ADR-002: Layered Architecture — App, State, Handlers, Orchestrators, Presenters, Screens

## Status
Accepted

## Context
The registration app grew from a simple form to a complex multi-step workflow managing 12 courts, waitlist, court blocks, guest registration, member search, and mobile flow. A single-component-with-hooks approach became unmaintainable past ~1500 lines, with interleaved UI logic, business rules, and API calls.

## Decision
Strict layered separation with ESLint-enforced boundaries:

```
App.jsx
  -> useRegistrationAppState()  (state assembly from 6 sub-hooks)
  -> useRegistrationHandlers()  (React hook bridge to orchestrators)
  -> RegistrationRouter
       -> *Route              (wiring: app + handlers -> presenter -> screen)
       -> Presenters          (pure functions: AppState -> screen props)
       -> *Screen             (pure UI: props -> JSX)
  -> Orchestrators            (multi-step workflows with dependency injection)
```

Layer rules:
- **Screens** cannot import orchestrators, backend, or state hooks
- **Presenters** are pure functions (no React imports)
- **Orchestrators** are pure functions with injected deps (no React, no direct state)
- **Handlers** bridge React hooks to orchestrators via dependency objects

## Alternatives Considered
- **Single component with hooks** (original): Worked initially but created a 2000+ line file with deeply interleaved concerns. Testing required full React runtime.
- **Redux/Zustand**: Adds external dependency and boilerplate. For a solo-dev project the composed-hooks approach was simpler and familiar.
- **MVC pattern**: Considered, but React's component model maps more naturally to the presenter/screen split than to classical MVC controllers.

## Consequences
- **Positive**: Orchestrators and presenters are testable without React runtime. Screens are pure UI components. Clear extension path for new features. ESLint enforces boundaries automatically.
- **Negative**: AppState "God Object" assembles all 33 keys in one interface (governed by contract test and top-level key policy, see ADR-005). Handler dependency arrays can be long. New developers must learn the layer conventions.
