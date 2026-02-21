# ADR-001: Backend-Authoritative Architecture with Supabase Edge Functions

## Status
Accepted

## Context
The club registration system serves four client surfaces — kiosk, mobile, admin dashboard, and courtboard display — all sharing real-time court availability, waitlist, and session data. Consistency across clients is critical: a court assigned on the kiosk must immediately reflect on the courtboard and admin screens.

The original prototype used client-side localStorage with no shared backend, which broke down as soon as multiple surfaces needed the same data.

## Decision
All mutations go through Supabase Edge Functions (Deno-based serverless handlers). Clients are read-heavy, subscribing to real-time board changes via Supabase Realtime (polling fallback). Row-Level Security (RLS) enforces access rules at the database layer.

Key patterns:
- Commands (`assignCourt`, `endSession`, `addToWaitlist`) are Edge Functions that validate, mutate, and return results
- Queries (`getBoard`, `getMembers`) read from views/tables with RLS
- Clients subscribe to board changes and re-render on push updates

## Alternatives Considered
- **Client-side localStorage** (original prototype): No shared state across surfaces. Rejected for multi-client requirement.
- **Direct Supabase client mutations**: Clients writing directly to tables. Rejected because business logic (duplicate detection, waitlist ordering, block validation) must be centralized, not duplicated per client.
- **Custom REST API**: More control but significantly more infrastructure to maintain for a solo-dev club project. Supabase provides auth, realtime, and hosting out of the box.

## Consequences
- **Positive**: Single source of truth for all clients. Business logic centralized in Edge Functions. RLS provides defense-in-depth. Real-time subscriptions keep UIs current without polling.
- **Negative**: Edge Function cold starts add latency on first invocation. Offline operation is limited to read-only cached data. Supabase vendor dependency for hosting and realtime infrastructure.
