# Mobile Architecture Contract

> **Purpose**: Prevent architectural drift in the Mobile.html three-iframe system.
> **Rule**: Any change to sessionStorage keys, message types, or ownership boundaries must update this file first.

---

## sessionStorage Keys

| Key | Owner | Type | Purpose |
|-----|-------|------|---------|
| `mobile-registered-court` | MobileBridge | `string \| null` | Court number user is registered on (e.g., "5") |
| `mobile-waitlist-entry-id` | MobileBridge | `string \| null` | UUID of user's waitlist entry |

**Access rules**:
- Only `MobileBridge` writes to these keys
- Other files read via `MobileBridge.getState()` or listen for `mobile:state-updated`
- Never read sessionStorage directly from iframes

---

## Message Types

| Type | Direction | Payload | Sender | Handler |
|------|-----------|---------|--------|---------|
| `register` | Courtboard → Registration | `{ type, courtNumber }` | mobile-bridge.js | App.jsx |
| `assign-from-waitlist` | Courtboard → Registration | `{ type, courtNumber, waitlistEntryId }` | mobile-bridge.js | App.jsx |
| `registration:success` | Registration → Parent | `{ type, courtNumber }` | App.jsx | Mobile.html |
| `waitlist:joined` | Registration → Parent | `{ type, entryId }` | App.jsx | Mobile.html |
| `register:closed` | Registration → Parent | `{ type }` | App.jsx | Mobile.html |
| `mobile:state-updated` | Parent → Courtboard | `{ type, payload: { registeredCourt, waitlistEntryId } }` | MobileBridge | main.jsx |

**Message flow**:
```
User taps court
       │
       ▼
┌─────────────┐    register / assign-from-waitlist    ┌─────────────┐
│  Courtboard │ ─────────────────────────────────────▶│ Registration│
│   iframe    │                                       │   iframe    │
└─────────────┘                                       └─────────────┘
       ▲                                                     │
       │                                                     │
       │              registration:success                   │
       │              waitlist:joined                        │
       │              register:closed                        ▼
       │                                              ┌─────────────┐
       │◀──────── mobile:state-updated ───────────── │ Mobile.html │
       │                                              │ (MobileBridge)
       │                                              └─────────────┘
```

---

## File Ownership

| Responsibility | Owner | Never Do |
|----------------|-------|----------|
| State persistence (sessionStorage) | Mobile.html → MobileBridge | Don't write sessionStorage from iframes |
| State broadcast | Mobile.html → MobileBridge | Don't skip broadcast after state change |
| Court rendering & modals | main.jsx | Don't manage session state here |
| Waitlist-available notice | main.jsx | Don't read sessionStorage directly; use mobileState |
| Registration actions | App.jsx | Don't update parent state directly; send messages |
| Button states | mobile-fallback-bar.js | Don't duplicate availability logic; use courtAvailability.js |
| Court availability calc | courtAvailability.js | Don't inline this logic elsewhere |

---

## MobileBridge API

```javascript
// In Mobile.html
const MobileBridge = {
  setRegisteredCourt(courtNumber),  // string | null
  setWaitlistEntryId(entryId),      // string | null
  getState(),                        // { registeredCourt, waitlistEntryId }
  broadcastState()                   // sends mobile:state-updated to iframes
};
```

**Invariant**: Every `set*` method must call `broadcastState()` before returning.

---

## Adding a New Feature Checklist

- [ ] Does it need new sessionStorage? → Add key to MobileBridge, update this doc
- [ ] Does it need new message type? → Define direction & payload, update this doc
- [ ] Does it read court availability? → Use `courtAvailability.js`, not inline logic
- [ ] Does it change button states? → Update `mobile-fallback-bar.js` state table

---

## Known Constraints

1. **No direct sessionStorage reads from iframes** - React won't re-render; use message broadcasts
2. **Silent assign mode** - When first-in-waitlist taps court, skip search UI; go straight to assign
3. **Overtime courts are playable** - Courts past session end time count as available
4. **Geofence disabled for testing** - `SKIP_GEOFENCE_CHECK = true` in backend; re-enable for production

---

*Last updated: 2025-01-20*
*Related commit: 8f04a98 - Mobile waitlist flow complete*
