# Database Schema Reference

> **Note:** The database lives in a separate Supabase project (noltc-backend/).
> This schema is inferred from the normalize layer, wire format, Zod schemas,
> and domain types in this codebase. Column names reflect the snake_case format
> used by the Edge Functions / RPC layer.

## Tables

### sessions
Active and historical court sessions.

| Column | Type | Notes |
|--------|------|-------|
| session_id | uuid | Primary key |
| court_id | integer | FK → courts |
| court_number | integer | Display number (1-12) |
| started_at | timestamptz | Session start |
| scheduled_end_at | timestamptz | Expected end |
| actual_end_at | timestamptz | Nullable, set on end |
| end_reason | text | cleared, observed_cleared, admin_override, overtime_takeover, auto_cleared |
| session_type | text | e.g. standard, tournament |
| is_tournament | boolean | Tournament match flag |
| participants | jsonb | Array of participant objects |
| minutes_remaining | integer | Computed or stored |

### courts
Court definitions (12 courts, court 8 is singles-only).

| Column | Type | Notes |
|--------|------|-------|
| court_id | integer | Primary key |
| court_number | integer | Display number (1-12) |

### court_blocks
Scheduled court blocks (maintenance, events, wet courts).

| Column | Type | Notes |
|--------|------|-------|
| block_id | uuid | Primary key |
| court_id | integer | FK → courts |
| court_number | integer | Display number |
| block_type | text | e.g. maintenance, event, wet |
| title | text | Block reason/description |
| starts_at | timestamptz | Block start |
| ends_at | timestamptz | Block end |
| is_recurring | boolean | Recurring block flag |
| recurrence_rule | text | Nullable, recurrence spec |

### waitlist_entries
Waitlist queue for court assignments.

| Column | Type | Notes |
|--------|------|-------|
| entry_id | uuid | Primary key |
| queue_position | integer | Position in queue |
| joined_at | timestamptz | When group joined |
| minutes_waiting | integer | Computed or stored |
| estimated_court_time | timestamptz | Estimated assignment time |
| deferred | boolean | Deferred to full-time court |
| group_id | uuid | FK → groups |
| group_type | text | Group type (singles, doubles, etc.) |
| players | jsonb | Participant array (denormalized) |

### groups
Registration groups (players signing up together).

| Column | Type | Notes |
|--------|------|-------|
| group_id | uuid | Primary key |
| group_type | text | singles, doubles, etc. |
| players | jsonb | Array of participant objects (may be string-encoded) |

### members / accounts
Member directory and account structure.

| Column | Type | Notes |
|--------|------|-------|
| member_id | uuid | Primary key |
| member_number | text | Club member number |
| display_name | text | Display name |
| is_guest | boolean | Guest flag |
| participant_type | text | member or guest |
| guest_name | text | Nullable, for guest participants |
| account_id | uuid | FK → accounts |
| is_primary | boolean | Primary account holder |

### transactions
Ball purchases and fee tracking.

| Column | Type | Notes |
|--------|------|-------|
| member_number | text | Member identifier |
| account_name | text | Account display name |
| amount_cents | integer | Transaction amount |
| amount_dollars | numeric | Computed or stored |

### system_settings
Club-wide configuration.

| Column | Type | Notes |
|--------|------|-------|
| ball_price_cents | integer | Ball bucket price |
| ball_bucket_size | integer | Balls per bucket |
| guest_fee_weekday_cents | integer | Weekday guest fee |
| guest_fee_weekend_cents | integer | Weekend guest fee |
| court_count | integer | Total courts (12) |
| check_status_minutes | integer | Status check interval |
| block_warning_minutes | integer | Warning before block |
| auto_clear_enabled | boolean | Auto-clear sessions |
| auto_clear_minutes | integer | Auto-clear threshold |

### operating_hours
Daily operating schedule with override support.

| Column | Type | Notes |
|--------|------|-------|
| day_of_week | integer | 0-6 (Sunday-Saturday) |
| opens_at | time | Opening time |
| closes_at | time | Closing time |
| is_closed | boolean | Closed flag |

Overrides stored separately (upcoming_overrides array from settings endpoint).

## Participant Object (JSONB)

Embedded in sessions, waitlist_entries, and groups:

| Field | Type | Notes |
|-------|------|-------|
| type | text | member or guest |
| member_id | uuid | Nullable for guests |
| account_id | uuid | Billing account |
| guest_name | text | Nullable, for guests |
| charged_to_account_id | uuid | Who pays guest fees |

## Edge Function Endpoints

### Mutations
| Endpoint | Primary Table | Description |
|----------|--------------|-------------|
| /assign-court | sessions | Create session with participants |
| /end-session | sessions | End active session |
| /join-waitlist | waitlist_entries | Add group to waitlist |
| /cancel-waitlist | waitlist_entries | Remove from waitlist |
| /assign-from-waitlist | sessions + waitlist_entries | Move waitlist entry to court |
| /remove-from-waitlist | waitlist_entries | Admin remove entry |
| /defer-waitlist | waitlist_entries | Toggle deferred flag |
| /reorder-waitlist | waitlist_entries | Change queue positions |
| /clear-waitlist | waitlist_entries | Clear all entries |
| /create-block | court_blocks | Schedule court block |
| /cancel-block | court_blocks | Remove block |
| /update-block | court_blocks | Modify block |
| /move-court | sessions | Transfer session between courts |
| /clear-all-courts | sessions | End all active sessions |
| /mark-wet-courts | court_blocks | Mark courts as wet |
| /clear-wet-courts | court_blocks | Remove wet marking |
| /purchase-balls | transactions | Record ball purchase |
| /update-system-settings | system_settings | Update config |
| /update-session-tournament | sessions | Toggle tournament flag |
| /undo-overtime-takeover | sessions | Reverse overtime takeover |
| /restore-session | sessions | Restore ended session |
| /admin-end-session | sessions | Admin force-end |
| /admin-update-session | sessions | Admin modify session |
| /cleanup-sessions | sessions | Garbage collect stale sessions |
| /generate-location-token | — | Generate geofence token |

### Queries
| Endpoint | Returns | Description |
|----------|---------|-------------|
| /get-board | courts + sessions + waitlist + blocks | Full board state |
| /get-members | members | Member search/lookup |
| /get-frequent-partners | members | Frequent partner list |
| /get-settings | system_settings + operating_hours | Club config |
| /get-blocks | court_blocks | Block list |
| /get-session-history | sessions | Historical sessions |
| /get-transactions | transactions | Transaction records |
| /get-analytics | sessions + court_blocks | Usage analytics |
| /get-usage-analytics | sessions | Heatmap data |
| /get-usage-comparison | sessions | Period comparison |

## Denial Codes

API mutations may return `{ ok: false, code: '<DENIAL_CODE>' }`:

COURT_OCCUPIED, COURT_BLOCKED, MEMBER_ALREADY_PLAYING, MEMBER_ON_WAITLIST,
OUTSIDE_OPERATING_HOURS, OUTSIDE_GEOFENCE, INVALID_GROUP, SESSION_NOT_FOUND,
WAITLIST_ENTRY_NOT_FOUND, BLOCK_CONFLICT

## Domain Constants

- **Court numbers:** 1-12
- **Singles-only court:** 8
- **Group types:** singles, doubles (defined in domain.js)
- **End reasons:** cleared, observed_cleared, admin_override, overtime_takeover, auto_cleared
