# ADR-003: Normalization Boundary — snake_case Wire Format to camelCase Domain

## Status
Accepted

## Context
Supabase returns database columns in snake_case (`member_number`, `scheduled_end_at`, `is_occupied`). React and JavaScript conventions use camelCase (`memberNumber`, `scheduledEndAt`, `isOccupied`). Without a clear boundary, snake_case and camelCase references intermixed throughout the codebase, causing bugs where code accessed the wrong key format.

## Decision
A dedicated normalization layer (`src/lib/normalize/`) transforms API responses at the boundary. All application code downstream uses camelCase domain objects. The normalize functions produce typed domain interfaces (`DomainCourt`, `DomainSession`, `DomainWaitlistEntry`, etc.) defined in `appTypes.ts`.

Key files:
- `normalizeBoard.js` — transforms board response into `DomainBoard`
- `normalizeCourt.js` — transforms court rows into `DomainCourt`
- `normalizeWaitlistEntry.js` — transforms waitlist entries into `DomainWaitlistEntry`

## Alternatives Considered
- **Use snake_case throughout**: Violates JS conventions, confuses React prop naming, makes JSX awkward (`court.is_occupied` vs `court.isOccupied`).
- **Transform in components**: Scatters conversion logic across the codebase. Multiple components accessing the same data would each need their own transformation, creating inconsistency and duplication.
- **Automatic case converter middleware**: Considered a generic `snakeToCamel` utility, but rejected because some fields need special handling (e.g., `_raw` passthrough, nested objects, array fields).

## Consequences
- **Positive**: Clean domain code with consistent camelCase. Single transformation point is easy to audit and update. Type safety via domain interfaces catches field name mismatches at compile time.
- **Negative**: Normalize functions must be maintained per entity — when the backend adds a column, the normalizer must be updated. Dual naming exists at the boundary (API tests use snake_case, app tests use camelCase).
