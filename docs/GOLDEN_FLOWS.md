# Golden Flows

These are the critical user flows that must work correctly at all times. They serve as:
1. Manual regression test checklist
2. Input for automated Playwright tests

Each flow includes preconditions, steps, and observable results.

---

## Flow 1: Registration Happy Path

**Entry Point:** Registration app (`/src/registration/`)

### Preconditions
- At least one court available (not blocked, not wet)
- Valid member ID exists in system

### Steps
1. Open registration app in browser
2. Enter member ID in the input field
3. Click submit/register button

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI) | Success message displays with assigned court number |
| Secondary (Courtboard) | Open courtboard display — assigned court shows occupied with member info |
| API | Browser DevTools → Network tab shows registration endpoint returned HTTP 200 with `success: true` |

---

## Flow 2: Waitlist → Assignment Flow

**Entry Point:** Registration app (`/src/registration/`)

### Preconditions
- All courts currently occupied (none available)
- Test member is not already registered or on waitlist

### Steps
1. Open registration app
2. Enter member ID
3. Observe "no courts available" state
4. Click "Join Waitlist" (or equivalent action)
5. **Trigger court availability:**
   - Open Admin panel (`/src/admin/`)
   - Find an active session
   - Click "End Session" to free a court
6. Return to registration app or observe courtboard

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI - Step 4) | Confirmation shows member added to waitlist with queue position |
| Primary (UI - Step 6) | Member receives assignment notification or visual update |
| Secondary (Courtboard) | Freed court now shows the promoted waitlist member |
| API | Network tab: waitlist-join returns HTTP 200; assignment event received |

---

## Flow 3: Admin Analytics Render

**Entry Point:** Admin panel (`/src/admin/`)

### Preconditions
- Admin panel accessible
- At least one historical session exists (completed in the past)

### Steps
1. Open admin panel
2. Navigate to Analytics section/tab
3. Select a date range that includes historical data
4. Wait for charts to load

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI) | Charts and metrics render with data values |
| Primary (UI) | No error messages or empty states (given valid data range) |
| Console | Browser DevTools → Console shows no JavaScript errors |
| API | Network tab: analytics endpoint returns HTTP 200 with data payload |

---

## Flow 4: System Settings Override

**Entry Point:** Admin panel (`/src/admin/`)

### Preconditions
- Admin panel accessible
- System settings section exists

### Steps
1. Open admin panel
2. Navigate to System Settings section
3. Identify a modifiable setting (e.g., session duration, court count)
4. Change the value
5. Click Save
6. Refresh the browser page

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI - Step 5) | Save confirmation message appears |
| Primary (UI - Step 6) | After refresh, setting shows the new value |
| API | Network tab: settings update endpoint returns HTTP 200 |
| Behavior | New registrations reflect changed setting (if applicable) |

---

## Flow 5: Block Create → Block Visibility

**Entry Point:** Admin panel (`/src/admin/`)

### Preconditions
- Admin panel accessible
- At least one court exists that is not currently blocked

### Steps
1. Open admin panel
2. Navigate to Blocks section
3. Click "Create Block" (or equivalent)
4. Select a court, set time range, enter reason
5. Save the block
6. Open courtboard display in a separate tab/window

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI - Step 5) | Block appears in the blocks list with correct court, time, reason |
| Secondary (Courtboard) | Blocked court displays visual blocked indicator |
| Secondary (Registration) | Attempting to register shows blocked court as unavailable |
| API | Network tab: block creation endpoint returns HTTP 200 |

---

## Using These Flows

### Manual Testing
Run through each flow before deployments or after significant changes.

### Automated Testing
These flows are implemented as Playwright tests with:
- `data-testid` selectors for reliable element targeting
- API response assertions
- Visual state verification

### Reporting Issues
When a golden flow fails:
1. Note which flow and which step
2. Capture console errors
3. Capture network responses
4. Document browser/device information

---

## Regression Tripwires

These grep commands verify architectural invariants. Failure indicates regression.

### Window Globals Eliminated
```bash
# Must return 0 results
rg "window.__" src/registration
# Expected: 0

# Must return 0 results
rg "__registrationData" src/registration
# Expected: 0
```

### Overtime Eligibility Centralized
```bash
# Policy module exists and exports both functions
rg "export function compute" src/shared/courts/overtimeEligibility.js
# Expected: computeRegistrationCourtSelection, computePlayableCourts

# listPlayableCourts delegates to policy module
rg "computePlayableCourts" src/shared/courts/courtAvailability.js
# Expected: 1+ results

# No inline court filtering in registration App.jsx
rg "filter\(\(c\) => c\.isAvailable\)" src/registration/App.jsx
# Expected: 0
```

### BlockManager Decomposition
```bash
# Extracted modules exist
ls src/admin/blocks/hooks/useWetCourts.js
ls src/admin/blocks/CourtSelectionGrid.jsx
ls src/admin/blocks/BlockReasonSelector.jsx
ls src/admin/blocks/utils/expandRecurrenceDates.js
# Expected: All files exist

# Wet court handlers moved to hook
rg "const handleEmergencyWetCourt|const deactivateWetCourts|const clearWetCourt" src/admin/blocks/CompleteBlockManagerEnhanced.jsx
# Expected: 0

# Recurrence expansion moved to utility
rg "pattern.*daily|pattern.*weekly|pattern.*monthly" src/admin/blocks/CompleteBlockManagerEnhanced.jsx
# Expected: 0
```

### Navigation Performance Invariant
```bash
# No awaited network call before setCurrentScreen('group', ...) when adding first player
# Navigation must be immediate; fresh-data fetches run AFTER navigation
```

**Rule:** When adding the first player, the Group Management screen must render immediately. Any fresh-data fetches (registrant streak, frequent partners) must:
1. Run asynchronously AFTER `setCurrentGroup()` and `setCurrentScreen('group', ...)`
2. Update state when complete (background enrichment pattern)
3. NOT block the navigation with `await`

### Court Array Null Safety

**Invariant:** `board.courts` may contain `null` entries for courts without active sessions.

**Rule:** All iterations, filters, and finds over courts arrays must guard against nulls.

```javascript
// ✅ Correct
courts.filter((c) => c && c.isAvailable)
courts.find((c) => c && c.number === courtNumber)
for (const court of courts) { if (!court) continue; ... }

// ❌ Wrong - will crash on null entries
courts.filter((c) => c.isAvailable)
courts.find((c) => c.number === courtNumber)
```

**Files affected:**
- `src/shared/courts/overtimeEligibility.js`
- `src/courtboard/main.jsx`
