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

## Flow 6: Tournament Match Registration

**Entry Point:** Registration app (`/src/registration/`) → Success screen

### Preconditions
- Player has successfully registered on a court
- Success screen is displayed

### Steps
1. Complete registration → Success screen appears
2. Tap "Tournament match?" link (below "Change Court" button)
3. Confirmation modal appears with text:
   "We are registering for a Club tournament match and may play until completion."
4. Tap "Confirm" to mark as tournament match
5. Observe courtboard display

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI - Step 4) | "Priority until {time}" replaced by "✓ Tournament Match — plays until completion" |
| Secondary (Courtboard) | Court shows "Tournament" instead of "Until {time}" |
| Secondary (Courtboard) | Court color changes from light blue (occupied) to dark blue (overtime) when past scheduled end |
| API | Network tab: update-session-tournament endpoint returns HTTP 200 |

### Behavioral Invariants
- Tournament court NEVER turns dark green (selectable)
- Tournament court excluded from: waitlist CTAs, NextAvailablePanel, overtime availability
- Match cleared normally by players or admin

---

## Flow 7: Deferred Waitlist (Wait for Full Court Time)

**Entry Point:** Registration app (`/src/registration/`) → Court Selection screen

### Preconditions
- All available courts have upcoming blocks restricting full session time
- Session duration + 5 minute buffer exceeds time until block

### Steps (New Registration)
1. Complete player selection → Court Selection screen
2. All courts show time warnings (upcoming blocks)
3. "Wait for Full Time" button appears
4. Tap "Wait for Full Time"
5. Confirmation modal: "Your group will be added to the waitlist until a court with full session time is available."
6. Tap "Confirm"

### Steps (From Waitlist CTA)
1. Receive "court available" notification
2. Navigate to Court Selection screen
3. All courts show time warnings
4. "Stay on Waitlist" button appears
5. Tap "Stay on Waitlist"
6. Confirmation modal: "You will keep your place in line and be notified when a court with full session time becomes available."
7. Tap "Confirm"

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI) | Toast: "You'll be notified when a full-time court is available" |
| Secondary (Courtboard) | Group shows "Waiting for full court" (blue text) |
| Behavior | Deferred group does NOT block new registrations from seeing courts |
| Behavior | CTA fires only when full-time court available (no upcoming block within session + 5 min) |

### Behavioral Invariants
- Deferred entries are invisible to queue logic
- Don't count as active waiters
- Don't block fresh registrations from seeing available courts
- Multiple deferred groups: each needs its own full-time court

---

## Flow 8: Mobile Registration (via QR Code)

**Entry Point:** Member scans QR code → opens `Mobile.html` → 3-iframe layout

### Architecture

`Mobile.html` loads three iframes:
1. **Courtboard** (`src/courtboard/index.html?view=mobile`) — background court grid
2. **Registration** (overlay, shown on tap) — same registration app with `?view=mobile`
3. **Camera** (for QR location verification)

The registration iframe communicates with `Mobile.html` via `postMessage`:
- `Mobile.html` → registration: `{ type: 'register', courtNumber }` or `{ type: 'assign-from-waitlist', waitlistEntryId, courtNumber }`
- Registration → `Mobile.html`: `{ type: 'registration:success', courtNumber }` or `{ type: 'resetRegistration' }`

Mobile flow state is managed by `useMobileFlowController.js`.

### Preconditions
- Member has mobile device with browser
- QR code is accessible (posted at club or sent via notification)
- Device has GPS capability (or camera for QR location scan)

### Steps
1. Member scans QR code on mobile device
2. `Mobile.html` loads — courtboard displays in full screen
3. Member taps an available (green) court on the courtboard
4. Registration overlay slides up (`#regOverlay.show`)
5. `postMessage({ type: 'register', courtNumber })` sent to registration iframe
6. Registration iframe activates mobile flow (`mobileFlow = true`, `preselectedCourt = courtNumber`)
7. Member searches by name/ID (same as kiosk flow, mobile-optimized layout via `variant-mobile` CSS)
8. Group management (same as kiosk)
9. Court assignment — backend validates geolocation:
   - GPS coordinates sent with assign request (`getMobileGeolocation()`)
   - If GPS fails, QR scanner fallback offered (`gpsFailedPrompt`)
   - If QR scanned, `location_token` sent instead of coordinates
   - Backend validates against geofence → `OUTSIDE_GEOFENCE` denial if too far
10. On success: `registration:success` message sent to parent
11. Mobile countdown starts (8 seconds, synced with `Mobile.html` dismiss timer)
12. Overlay auto-dismisses after countdown

### Observable Results

| Check | What to Observe |
|-------|-----------------|
| Primary (UI) | Courtboard shows in full screen, tapping court opens registration overlay |
| Primary (UI) | Registration overlay shows mobile-optimized layout (`variant-mobile` class) |
| Primary (UI) | Success screen shows countdown timer (8 → 0) |
| GPS flow | DevTools → Network: assign request includes `latitude`/`longitude` |
| QR fallback | If GPS fails, "Verify Location" prompt appears with QR scanner option |
| Location token | If QR scanned, assign request includes `location_token` instead of GPS |
| Geofence | If outside geofence, backend returns `OUTSIDE_GEOFENCE` denial |
| Post-success | Overlay dismisses after countdown, courtboard shows updated court status |

### Key Differences from Kiosk

| Aspect | Kiosk | Mobile |
|--------|-------|--------|
| Entry | Direct URL | QR code → `Mobile.html` |
| Layout | Full registration app | 3-iframe layout (courtboard + overlay) |
| Court selection | Manual from list | Pre-selected by tapping courtboard |
| Location | Not required | GPS or QR token required |
| Success | Stays on success screen | 8-second countdown → auto-dismiss |
| Communication | Direct state | `postMessage` between iframes |

### Regression Tripwires

```bash
# Mobile view detection
rg "IS_MOBILE_VIEW\|IS_MOBILE" src/registration/ --include="*.{js,jsx,ts,tsx}" | grep -v test
# Expected: references in routes, presenters, and orchestrators

# Geofence validation in assign flow
rg "geofence\|geolocation\|OUTSIDE_GEOFENCE\|getMobileGeolocation" src/registration/orchestration/ | grep -v test
# Expected: references in assignCourtOrchestrator

# Mobile countdown mechanism
rg "mobileCountdown\|registration:success\|resetRegistration" src/registration/ | grep -v test
# Expected: references in useMobileFlowController and presenters

# postMessage communication
rg "postMessage\|addEventListener.*message" src/registration/ui/mobile/ | grep -v test
# Expected: message listener in useMobileFlowController, postMessage sends
```

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
