# NOLTC Tennis Court Registration - Testing Guide

## Test Types

This project uses two test frameworks:

| Type | Framework | Count | Location | Command |
|------|-----------|-------|----------|---------|
| Unit | Vitest | 994 | `tests/unit/` | `npm run test:unit` |
| E2E | Playwright | 14 | `e2e/` | `npm run test:e2e` |

## Verification Gate

**All commits must pass the full verification suite:**
```bash
npm run verify
```

This runs in order:
1. `npm run lint:ratchet` — ESLint with baseline enforcement (0 errors, warnings must not increase)
2. `npm run type:ratchet` — TypeScript with baseline enforcement (error count must not increase)
3. `npm run test:unit` — Vitest unit tests (994 tests)
4. `npm run build` — Vite production build
5. `npm run test:e2e` — Playwright E2E tests (14/14 required)

**Do not merge if any step fails.**

## Where to Add Tests

### Unit Tests
- **Location**: `tests/unit/`
- **For**: Business logic, utilities, pure functions, reducers
- **Framework**: Vitest
- **Naming**: `*.test.js`

### E2E Tests
- **Location**: `e2e/`
- **For**: Full user flows, screen interactions, integration
- **Framework**: Playwright
- **Naming**: `*.spec.js`

### Guidelines
- Add unit test for new business logic
- Add E2E test for new user-facing flows
- Both must pass before merge

---

## Unit Tests (Vitest)

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run in watch mode
npm run test:unit:watch

# Run a specific test file
npx vitest run tests/unit/lib/courtHelpers.test.js
```

### Unit Test Structure

Tests mirror the source structure:
```
tests/unit/
├── lib/                    # Tests for src/lib/
├── shared/                 # Tests for src/shared/
├── registration/           # Tests for src/registration/
│   ├── blocks/
│   ├── court/
│   ├── group/
│   ├── search/
│   └── ...
└── admin/                  # Tests for src/admin/
```

---

## Automated E2E Tests (Playwright)

### Running Tests Locally

```bash
# Build first (required)
npm run build

# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npx playwright test --ui

# Run a specific test file
npx playwright test e2e/registration-happy-path.spec.js
```

### Test Files

#### Core Tests
| Test | Flow Covered | Entry Point |
|------|--------------|-------------|
| `registration-happy-path.spec.js` | Registration Happy Path | `/src/registration/index.html` |
| `admin-analytics-render.spec.js` | Analytics Dashboard | `/src/admin/index.html` |
| `admin-settings-override.spec.js` | System Settings | `/src/admin/index.html` |
| `admin-block-create.spec.js` | Block Management | `/src/admin/index.html` |

#### Additional Tests
| Test | Flow Covered | Entry Point | Fixture |
|------|--------------|-------------|---------|
| `waitlist-cta-flow.spec.js` | Waitlist "Court Available" CTA | `/src/registration/index.html` | `board-state-waitlist.json` |
| `waitlist-cta-refresh.spec.js` | CTA updates when court frees after refresh | `/src/registration/index.html` | `board-state-all-occupied.json` → `board-state-one-available.json` |
| `overtime-takeover.spec.js` | Overtime court takeover eligibility | `/src/registration/index.html` | `board-state-overtime-only.json` |
| `clear-court-flow.spec.js` | Clear occupied court | `/src/registration/index.html` | `board-state.json` |
| `deferred-waitlist.spec.js` | Block warning on time-restricted court assignment | `/src/registration/index.html` | `board-state-deferred-with-opening.json` |
| `tournament-match.spec.js` | Tournament match designation from success screen | `/src/registration/index.html` | `board-state-tournament.json` |
| `success-home-button.spec.js` | Home button clickable on success screen (regression) | `/src/registration/index.html` | `board-state.json` |
| `null-courts-handling.spec.js` | Courtboard renders with null court entries | `/src/courtboard/index.html` | `board-state-with-nulls.json` |
| `block-refresh-wiring.spec.js` | Admin blocks tab reflects new block after refresh | `/src/admin/index.html` | `blocks-data-empty.json` → `blocks-data-with-new-block.json` |
| `block-state-transition.spec.js` | Courtboard blocked → available after refresh | `/src/courtboard/index.html` | `board-state-blocked.json` → `board-state-unblocked.json` |

### E2E Test Mode

Tests run with `?e2e=1` query parameter which:
- Disables realtime subscriptions (prevents flaky WebSocket tests)
- Uses mocked API responses from `e2e/fixtures/`

This is strictly gated and does not affect production behavior.

### CI Integration

E2E tests run automatically on:
- Push to `main` branch
- All pull requests

On failure, a Playwright HTML report is uploaded as a CI artifact.

### Test Fixtures

| Fixture | Purpose |
|---------|---------|
| `board-state.json` | Default board with mix of court states |
| `board-state-all-occupied.json` | All courts occupied (no availability) |
| `board-state-all-restricted.json` | All courts restricted |
| `board-state-blocked.json` | Board with blocked courts |
| `board-state-deferred-with-opening.json` | Deferred waitlist with time-restricted opening |
| `board-state-one-available.json` | Single court available (CTA refresh target) |
| `board-state-overtime-only.json` | No free courts, only overtime available |
| `board-state-tournament.json` | Board state for tournament match flow |
| `board-state-unblocked.json` | Board after block removal |
| `board-state-waitlist.json` | Free court + waitlist entry (triggers CTA) |
| `board-state-with-nulls.json` | Board with null court entries (defensive test) |
| `analytics-data.json` | Analytics metrics |
| `blocks-data.json` | Block list |
| `blocks-data-empty.json` | Empty block list (pre-creation state) |
| `blocks-data-with-new-block.json` | Block list after new block created |
| `settings-data.json` | System settings |

### Updating Fixtures

If API response shapes change, update the corresponding files in `e2e/fixtures/`.

---

## Manual Testing Checklist

### Prerequisites
- Dev server running: `npm run dev`
- Supabase backend deployed
- Clean database state (or known state)

---

## Registration Flows

### 1. Singles Registration
- [ ] Search for player by name
- [ ] Select player from dropdown
- [ ] Verify player appears in group
- [ ] Click "Select a Court"
- [ ] Select available court
- [ ] Verify success screen
- [ ] Verify player appears on Courtboard

### 2. Doubles Registration
- [ ] Add first player
- [ ] Add second player (different from first)
- [ ] Verify both appear in group
- [ ] Complete court assignment
- [ ] Verify both players on Courtboard

### 3. Foursome Registration
- [ ] Add 4 players
- [ ] Complete court assignment
- [ ] Verify all 4 on Courtboard

### 4. Clear Court
- [ ] Select occupied court to clear
- [ ] Confirm clear action
- [ ] Verify court clears on Courtboard
- [ ] Verify player can re-register immediately

### 5. Clear Overtime Court
- [ ] Wait for court to go overtime (or use test data)
- [ ] Clear overtime court
- [ ] Verify clears successfully

---

## Waitlist Flows

### 6. Join Waitlist
- [ ] Fill all courts (or block them)
- [ ] Add player to group
- [ ] Verify "Join Waitlist" button appears (not "Select Court")
- [ ] Click Join Waitlist
- [ ] Verify success screen shows position and wait time
- [ ] Verify player appears on Courtboard waitlist

### 7. Waitlist CTA (You're Up)
- [ ] Have groups on waitlist
- [ ] Clear a court (or let block expire)
- [ ] Verify Courtboard shows "You're Up" for first group
- [ ] Verify Registration Search screen shows CTA button
- [ ] Click CTA
- [ ] Complete court assignment
- [ ] Verify group removed from waitlist

### 8. Waitlist with Blocks
- [ ] Block all courts
- [ ] Join waitlist
- [ ] Verify wait time accounts for block expiry
- [ ] Verify "You're Up" does NOT show while blocked
- [ ] After block expires, verify "You're Up" appears

---

## Admin Flows

### 9. End Session (Admin)
- [ ] Open Admin panel
- [ ] Select occupied court
- [ ] End session
- [ ] Verify court clears on Courtboard

### 10. Clear All Courts (Admin)
- [ ] Occupy multiple courts
- [ ] Use Clear All
- [ ] Verify all courts clear
- [ ] Check console for errors

### 11. Remove from Waitlist (Admin)
- [ ] Have groups on waitlist
- [ ] Remove one via Admin
- [ ] Verify removed from Courtboard waitlist

### 12. Court Blocks (Admin)
- [ ] Create a block on a court
- [ ] Verify block appears on Courtboard
- [ ] Verify block appears in Admin
- [ ] Delete block
- [ ] Verify block removed

### 13. Game History (Admin)
- [ ] Navigate to Game History tab
- [ ] Click Search
- [ ] Verify past sessions appear

---

## Edge Cases

### 14. Change Court (within 30 sec)
- [ ] Complete registration
- [ ] On success screen, click "Change Court"
- [ ] Select different court
- [ ] Verify player moves to new court

### 15. Session Timeout
- [ ] Start registration flow
- [ ] Wait 90 seconds (warning should appear)
- [ ] Wait 30 more seconds (should reset to welcome)

### 16. Re-register Same Player
- [ ] Register player on court
- [ ] Clear court
- [ ] Register same player again
- [ ] Verify success (no "already playing" error)

### 17. Realtime Sync
- [ ] Open Courtboard and Registration side-by-side
- [ ] Make change in Registration
- [ ] Verify Courtboard updates without refresh

---

## Console Checks

After each flow, verify:
- [ ] No uncaught errors in console
- [ ] No "undefined" or "null" reference errors
- [ ] API calls succeed (check Network tab)

---

## Known Issues / Warnings

- ESLint warnings tracked in lint ratchet baseline (non-blocking)
- `TennisDataService.js` is deprecated (legacy localStorage)
