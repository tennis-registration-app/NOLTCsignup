# Dependency Map

> High-level module boundaries and import rules. Text-based to stay maintainable.

## Application Topology

```
┌─────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│ Registration │  │  Admin   │  │ Courtboard │  │  Mobile  │
│   (kiosk)   │  │  Panel   │  │  Display   │  │  Shell   │
└──────┬──────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘
       │              │              │               │
       └──────────────┴──────────────┴───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    Shared Lib     │
                    │   (@lib alias)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Supabase Backend │
                    │  (separate repo)  │
                    └───────────────────┘
```

Each app has its own entry point (`main.jsx`), HTML file, and Vite config. They share `src/lib/`, `src/shared/`, `src/platform/`, and `src/tennis/` but do not import from each other.

## Registration App Layers (most complex)

```
Screens → Presenters → AppState (33 slices)
                           │
Handlers ← buildHandlerDeps ← AppState
    │
    ▼
Orchestrators → Backend (TennisCommands/TennisQueries)
```

- **Screens** receive explicit props from presenters. No direct state access.
- **Presenters** destructure `app` into named slices, assemble screen props.
- **Handlers** receive named slice params via `buildHandlerDeps.js`.
- **Orchestrators** receive typed `state`, `actions`, `services` params. Pure async functions.
- **Backend** accessed only through `src/lib/` commands/queries.

## Import Rules

| From → To | Allowed? | Notes |
|-----------|----------|-------|
| Screen → Presenter | Yes | Screens call `buildXxxModel` / `buildXxxActions` |
| Presenter → AppState | Yes | Immediate destructure only (slice discipline) |
| Presenter → Orchestrator | No | Presenters are pure prop mappers |
| Handler → Orchestrator | Yes | Via deps injection (not direct import) |
| Orchestrator → Backend | Yes | Via typed `services` param |
| Component → `window.Tennis` | No | Courtboard ESM: use `windowBridge` (ADR-006) |
| Anything → `appTypes.ts` | Yes | Shared type definitions |
| App A → App B source | No | Apps are independent; share only via `src/lib/` |

## Shared Libraries (@lib)

| Module | Purpose |
|--------|---------|
| `src/lib/backend/` | TennisCommands (mutations), TennisQueries (reads), TennisAdmin |
| `src/lib/normalize/` | snake_case → camelCase boundary (`normalizeBoard.js`) |
| `src/lib/schemas/` | Zod validation — source of truth for API wire format |
| `src/lib/errors/` | `AppError` class, error categories |
| `src/platform/` | `windowBridge.js`, device detection, `attachLegacy*.js` adapters |
| `src/tennis/` | Domain logic: availability, blocks, roster, waitlist, time |
| `src/shared/` | Shared React components, court utilities |

## Do Not Touch Casually

| Module | Why | Risk |
|--------|-----|------|
| `buildRegistrationReturn.ts` | 33-key AppState assembly | Breaks all consumers |
| `normalizeBoard.js` | Wire format → domain model | Breaks all court display |
| `useRegistrationHandlers.js` | Handler wiring (18 `app.` reads) | Breaks all user interactions |
| `buildHandlerDeps.js` | Handler deps assembly (contract-tested) | Breaks all handlers |
| `courtboardPreInit.js` | Boot-order dependent IIFE | Breaks courtboard display |
| `index.html` (courtboard) | Script load order matters | Breaks courtboard boot |
| `appTypes.ts` | 33 top-level keys frozen by contract test | Breaks type safety |

## Courtboard Legacy (ADR-006)

The courtboard has two module systems coexisting:

- **ESM** (components, hooks, mobile): Modern, testable, fenced by ESLint rule. Must use `windowBridge` accessors instead of `window.Tennis.*`.
- **IIFE scripts** (5 files, 945 lines): Legacy, boot-order dependent, tagged with deletion conditions. Exempted from ESLint fence.

See [docs/adr/006-courtboard-legacy-containment.md](adr/006-courtboard-legacy-containment.md) for the full containment strategy and global ownership table.
