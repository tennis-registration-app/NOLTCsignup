# WP4-4: Naming Convention Inventory

**Date:** 2026-02-02
**Work Package:** WP4-4 (Phase 4 Architectural Cleanup)
**Purpose:** Scope lock for snake_case → camelCase normalization

---

## Executive Summary

| Category | Files | snake_case Occurrences |
|----------|-------|------------------------|
| Boundary-Allowed (normalize layer) | 9 | N/A (by design) |
| Boundary-Allowed (ApiAdapter/backend) | 3 | N/A (by design) |
| Leakage - Admin | 3 | ~35 |
| Leakage - Registration | 4 | ~12 |
| Leakage - Courtboard | 1 | ~10 |
| **Total Leakage** | **8** | **~57** |

---

## 1. Boundary Modules (snake_case Allowed)

These files form the API translation boundary. snake_case is expected and correct here.

### 1.1 Normalization Layer (`src/lib/normalize/`)

| File | Purpose |
|------|---------|
| `normalizeBoard.js` | Top-level board transformer |
| `normalizeCourt.js` | Court + session transformer |
| `normalizeSession.js` | Session transformer |
| `normalizeGroup.js` | Group/players transformer |
| `normalizeMember.js` | Member transformer |
| `normalizeBlock.js` | Block transformer |
| `normalizeWaitlistEntry.js` | Waitlist entry transformer |
| `index.js` | Public exports (normalizeBoard only) |

**Architectural Rule:** Only `normalizeBoard()` is exported to components. Individual normalizers are internal implementation details.

### 1.2 API Adapter (`src/lib/ApiAdapter.js`)

Low-level HTTP client that communicates with backend. Uses snake_case for:
- Request payloads: `operating_hours`, `operating_hours_override`
- Response passthrough: `operating_hours`, `upcoming_overrides`

### 1.3 Backend Services (`src/registration/backend/`)

Files that interface directly with ApiAdapter:
- `admin/AdminCommands.js` - Admin operations
- `TennisBackend.js` - Main backend facade

---

## 2. Leakage Inventory (snake_case in UI Code)

### 2.1 Admin Components

#### `src/admin/screens/SystemSettings.jsx`

**Lines with snake_case (27 occurrences):**

| Line | Property | Source |
|------|----------|--------|
| 65 | `ball_price_cents` | API response |
| 67 | `guest_fee_weekday_cents` | API response |
| 68 | `guest_fee_weekend_cents` | API response |
| 77-80 | `auto_clear_enabled`, `auto_clear_minutes`, `check_status_minutes`, `block_warning_minutes` | API response |
| 84-88 | `h.day_of_week`, `day_name` | API response, local mapping |
| 92-93 | `result.operating_hours`, `result.upcoming_overrides` | API response |
| 154-156 | `ball_price_cents`, `guest_fee_weekday_cents`, `guest_fee_weekend_cents` | API request |
| 220-223 | `auto_clear_enabled`, `auto_clear_minutes`, `check_status_minutes`, `block_warning_minutes` | API request |
| 244-267 | `day_of_week`, `opens_at`, `closes_at`, `is_closed` | State & render |
| 291-295 | `opens_at`, `closes_at`, `is_closed` | API request |
| 445-499 | `day_of_week`, `day_name`, `is_closed`, `opens_at`, `closes_at` | Render loop |
| 709-727 | `override.is_closed`, `override.opens_at`, `override.closes_at` | Render loop |

**Data Flow:**
```
backend.admin.getSettings()
  → result.operating_hours (snake_case array)
  → setOperatingHours(hours) (snake_case preserved in state)
  → render: day.day_of_week, day.is_closed, day.opens_at, day.closes_at
```

#### `src/admin/screens/components/OperatingHoursCard.jsx`

**Lines with snake_case (8 occurrences):**

| Line | Property |
|------|----------|
| 46 | `day.day_of_week` |
| 48, 55 | `day.is_closed` |
| 51 | `day.day_name` |
| 58-60, 70, 75-76, 87, 91 | `day.opens_at`, `day.closes_at` |

**Note:** This component receives `operatingHours` prop from SystemSettings, inheriting the same snake_case shape.

#### `src/admin/calendar/WeekView.jsx`

**Lines with snake_case (6 occurrences):**

| Line | Property |
|------|----------|
| 127, 140, 145, 153 | `override.is_closed` |
| 155 | `override.opens_at`, `override.closes_at` |

**Data Flow:**
```
hoursOverrides prop (from parent)
  → overridesByDate lookup
  → render: override.is_closed, override.opens_at, override.closes_at
```

#### `src/admin/ai/AIAssistant.jsx`

**Lines with snake_case (4 occurrences):**

| Line | Property |
|------|----------|
| 62 | `proposed_tool` |
| 113 | `day_of` (partial match) |

**Note:** AI assistant tool interface - likely deliberate API shape.

---

### 2.2 Registration Components

#### `src/registration/screens/SuccessScreen.jsx`

**Lines with snake_case (8 occurrences):**

| Line | Property | Context |
|------|----------|---------|
| 163 | `player.account_id` | Fallback check |
| 171-172 | `m.is_primary`, `member.account_id` | Member lookup |
| 194 | `player.account_id` | Fallback check |
| 201-202 | `m.is_primary`, `member.account_id` | Member lookup |

**Data Flow:** Member lookup returns snake_case, component uses dual-format fallback:
```javascript
let accountId = player.accountId || player.account_id;
const member = members.find((m) => m.is_primary || m.isPrimary);
```

#### `src/registration/screens/components/BallPurchaseFeature.jsx`

**Lines with snake_case (6 occurrences):**

| Line | Property |
|------|----------|
| 98, 107, 129, 137 | `account_id` |
| 106, 136 | `is_primary` |

**Note:** Same pattern as SuccessScreen - member lookup fallback.

#### `src/registration/screens/ClearCourtScreen.jsx`

**Line 164:** `display_name`

**Note:** Court session player data - may come from API.

#### `src/registration/components/ApiTestPanel.jsx`

**Line 170:** `member_number`, `display_name`

**Note:** Debug panel - may be acceptable for raw API display.

---

### 2.3 Courtboard Components

#### `src/courtboard/components/TennisCourtDisplay.jsx`

**Lines with snake_case (10 occurrences):**

| Line | Property |
|------|----------|
| 221, 229, 231-232, 235 | `check_status_minutes` |
| 238-240, 243 | `block_warning_minutes` |

**Data Flow:**
```
backend.admin.getSettings()
  → result.settings.check_status_minutes (snake_case)
  → setCheckStatusMinutes(parseInt(...))
```

---

### 2.4 Orchestration Helpers (Dual-Format Fallback)

#### `src/registration/orchestration/helpers/assignCourtValidation.js`

**Lines 56-61:** Handles both formats:
```javascript
const todayHours = operatingHours.find((h) => (h.dayOfWeek ?? h.day_of_week) === dayOfWeek);
const isClosed = todayHours?.isClosed ?? todayHours?.is_closed;
const opensAtValue = todayHours.opensAt ?? todayHours.opens_at;
```

**Note:** This is a transition pattern - accepts both formats for backwards compatibility.

---

## 3. ESLint Configuration

### Current State

**File:** `eslint.config.js`

- **No camelcase rule configured**
- No `@typescript-eslint/naming-convention` (pure JS project)
- Ratchet baseline: 32 warnings (30 `no-unused-vars`, 2 `react-hooks/exhaustive-deps`)

### Ratchet Mechanism

**File:** `eslint-baseline.json`
```json
{
  "errors": 0,
  "warnings": 32,
  "byRule": {
    "no-unused-vars": 30,
    "react-hooks/exhaustive-deps": 2
  }
}
```

**Scripts:** `npm run lint:ratchet` (node scripts/lint-ratchet.mjs)

---

## 4. Recommended Fix Strategy

### Phase 1: Normalize at Ingestion Point

Create normalizers for settings data:

```javascript
// src/lib/normalize/normalizeOperatingHours.js
export function normalizeOperatingHours(raw) {
  return raw.map(h => ({
    dayOfWeek: h.day_of_week,
    dayName: DAYS[h.day_of_week],
    opensAt: h.opens_at,
    closesAt: h.closes_at,
    isClosed: h.is_closed,
  }));
}

// src/lib/normalize/normalizeSettings.js
export function normalizeSettings(raw) {
  return {
    ballPriceCents: raw.ball_price_cents,
    guestFeeWeekdayCents: raw.guest_fee_weekday_cents,
    guestFeeWeekendCents: raw.guest_fee_weekend_cents,
    autoClearEnabled: raw.auto_clear_enabled === 'true',
    autoClearMinutes: parseInt(raw.auto_clear_minutes),
    checkStatusMinutes: parseInt(raw.check_status_minutes),
    blockWarningMinutes: parseInt(raw.block_warning_minutes),
  };
}
```

### Phase 2: Update AdminCommands to Normalize

```javascript
// In getSettings():
return {
  ok: true,
  settings: normalizeSettings(raw.settings),
  operatingHours: normalizeOperatingHours(raw.operating_hours),
  upcomingOverrides: normalizeOverrides(raw.upcoming_overrides),
};
```

### Phase 3: Update Components

All leakage files switch from snake_case to camelCase properties.

### Phase 4: Add ESLint Rule

```javascript
// eslint.config.js
rules: {
  'camelcase': ['warn', {
    properties: 'never',  // Don't check object properties initially
    ignoreDestructuring: true,
  }],
}
```

---

## 5. Scope Lock

**This inventory is complete.** Any snake_case fixes must:

1. Only touch files listed in Section 2
2. Create normalizers in `src/lib/normalize/`
3. Not break existing tests (466 unit, 15 E2E)
4. Pass verification gate: `npm run verify`

---

## Appendix: Full snake_case Scan Command

```bash
rg -n "[a-z]+_[a-z]+" src/ --glob "*.jsx" -o | sort | uniq -c | sort -rn
```
