# NOLTC Tennis Court Registration - Testing Guide

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

| Test | Flow Covered | Entry Point |
|------|--------------|-------------|
| `registration-happy-path.spec.js` | Registration Happy Path | `/src/registration/index.html` |
| `admin-analytics-render.spec.js` | Analytics Dashboard | `/src/admin/index.html` |
| `admin-settings-override.spec.js` | System Settings | `/src/admin/index.html` |
| `admin-block-create.spec.js` | Block Management | `/src/admin/index.html` |

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

### Updating Fixtures

If API response shapes change, update the corresponding files in `e2e/fixtures/`:
- `board-state.json` — Court status data
- `analytics-data.json` — Analytics metrics
- `settings-data.json` — System settings
- `blocks-data.json` — Block list

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

- 366 ESLint warnings (non-blocking, to burn down)
- `TennisDataService.js` is deprecated (legacy localStorage)
