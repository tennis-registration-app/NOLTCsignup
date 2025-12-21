# TennisBackend Interface Contract

## Status: FROZEN (Phase 1B Complete)

No modifications to interface files without explicit architect approval.

## Frozen Files
- `types.js` - Type definitions
- `wire.js` - Wire format mappers
- `TennisQueries.js` - Read operations
- `TennisCommands.js` - Mutation operations
- `TennisDirectory.js` - Member lookups
- `index.js` - Factory/exports

## Interface Rules

### Court Identification
- **Display**: Use `court.number` (integer 1-12) for all UI display
- **Commands**: Use `court.id` (UUID) for all mutations
- **CourtState** includes both: `{ id, number, status, ... }`

### Command Inputs
All commands accept canonical types from `types.js`:
- `AssignCourtInput` - requires `courtId` (UUID)
- `EndSessionInput` - requires `courtId` (UUID)
- `JoinWaitlistInput` - no court reference
- etc.

### Wire Format
- `wire.js` is the ONLY place that knows Edge Function payload formats
- UI code must never construct raw payloads
- All translation happens in wire mappers

### Response Format
All commands return: `{ ok, serverNow, code?, message?, ...data }`

## Phase 1C Rules
- Replace ApiTennisService calls with TennisBackend calls
- Remove USE_API_BACKEND branching
- Remove localStorage tennis persistence
- Remove memberDatabase and cta-live usage
- NO new helper methods
- NO interface changes
