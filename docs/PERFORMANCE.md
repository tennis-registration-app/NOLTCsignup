# Performance — NOLTC Tennis Registration System

## Polling & Real-time Updates

| Component | Mechanism | Interval | Purpose | Cleanup |
|-----------|-----------|----------|---------|---------|
| Board subscription | `setInterval` | 30s (configurable via `pollIntervalMs`) | Refresh court data, catch expired blocks | `clearInterval` on unsubscribe |
| Backup poll | `setInterval` | 60s (or `pollIntervalMs` if > 30s) | Ensure display never stale on always-visible screens | `clearInterval` on unsubscribe |
| Visibility refresh | `visibilitychange` event | On tab focus | Immediate refresh when tab becomes visible | `removeEventListener` on unsubscribe |
| Refresh debounce | `setTimeout` | Dynamic (signal coalescing) | Prevent duplicate fetches from rapid signals | `clearTimeout` on next signal |
| Courtboard ready poll | `setInterval` | 100ms | Wait for Tennis modules to load | `clearInterval` when ready (10s timeout) |
| Debug panel | `setInterval` | 500ms | Dev-only metrics display | None (dev only) |
| Assignment poll | `setInterval` | Dynamic | Wait for backend confirmation after assign | `clearInterval` on completion |
| Mobile countdown | `setInterval` | 1s | Success screen countdown (synced with 8s Mobile.html dismiss) | `clearInterval` on effect cleanup |
| QR countdown | `setInterval` | 1s | Location QR code expiry timer | `clearInterval` via ref |
| Mobile fallback bar | `setInterval` | Dynamic | Queue timer for mobile waitlist | `clearInterval` on clear |
| Admin save status | `setTimeout` | 2s | Reset save indicator after confirmation | Automatic (5 instances in SystemSettings) |
| Health check | `setTimeout` | 1s | Mobile shell health check | Automatic |
| Admin timer registry | `timerRegistry.js` | N/A | Centralized cleanup for admin intervals | `clearAllTimers()` on unmount/unload |

**Key design:** All poll intervals check `document.hidden` before fetching — no wasted network calls when tab is in background.

**E2E mode:** When `?e2e=1` query param is present, `TennisQueries` skips polling entirely — single initial fetch only. This eliminates timing issues in Playwright tests.

## Known Hotspots

### Member search (autocomplete)

- **What:** Filters ~2,500 member records on each keystroke
- **Where:** `TennisDirectory.js` → sequential `.filter()` over member array
- **Mitigation:** Search input is debounced (`useDebounce.js`), result list is limited
- **Watch for:** Slow autocomplete response on older iPads
- **If needed:** Index members by name prefix (trie) or move search to Edge Function

### Waitlist rendering

- **What:** Waitlist entries re-render on each board poll cycle
- **Where:** `WaitlistSection.jsx`, `WaitingList.jsx`
- **Mitigation:** Practical limit ~20-30 entries in normal club operation
- **Watch for:** Sluggish reorder UI if waitlist exceeds ~50 entries
- **If needed:** Virtualized list (`react-window`) or paginated rendering

### Court status grid (courtboard)

- **What:** 12 court cards re-render on each poll cycle (30s)
- **Where:** `TennisCourtDisplay.jsx` → 12 `CourtCard.jsx` instances
- **Mitigation:** 12 items is small, no memoization needed at current scale
- **Watch for:** Only relevant if court count increases significantly

### Admin analytics charts

- **What:** Analytics components process history data on each render
- **Where:** `UsageHeatmap.jsx`, `WaitTimeAnalysis.jsx`, `GuestChargeLog.jsx`, etc.
- **Mitigation:** Heavy memoization (14 `useMemo`/`useCallback` in `EventCalendarEnhanced.jsx` alone)
- **Watch for:** Slow chart rendering with large date ranges

## Memoization Inventory

65 `useMemo`/`useCallback`/`React.memo` instances across 20 files:

| Area | Count | Key files |
|------|-------|-----------|
| Admin analytics | ~20 | UsageHeatmap, WaitTimeAnalysis, GuestChargeLog, BallPurchaseLog |
| Admin calendar | ~24 | EventCalendarEnhanced (14), DayViewEnhanced, WeekView, MonthView |
| Admin other | ~10 | SystemSettings, EventDetailsModal, BlockTimeline |
| Courtboard | ~4 | TennisCourtDisplay, NextAvailablePanel |
| Registration | ~7 | QRScanner, LocationQRCode, SuccessScreen |

Registration screens use minimal memoization — simple prop-driven renders, no expensive computations.

## Bundle Size

The app uses Vite for bundling. To analyze:

```bash
npx vite-bundle-visualizer
```

Key bundle considerations:
- Supabase client is the largest dependency
- Zod schemas add ~12KB (used in command DTOs)
- Three separate entry points (registration, admin, courtboard) — each has its own bundle
- Courtboard IIFE scripts are separate from the Vite bundle

## Profiling Recipe

### React DevTools Profiler

1. Install React DevTools browser extension
2. Open registration route → Profiler tab → Start recording
3. Perform: search member → select → assign court
4. Stop recording → check for components with >16ms renders
5. Focus on: GroupScreen (player list), CourtSelectionScreen (12 cards)

### Network performance

1. Open DevTools → Network tab → filter by Fetch/XHR
2. Perform registration flow
3. Check: Supabase Edge Function calls should complete in <500ms
4. Watch for: duplicate calls, missing cache hits in `TennisCourtDataStore`

### Polling verification

1. Open DevTools → Console → filter by `TennisQueries`
2. Observe: `[poll]` and `[backup-poll]` logs at expected intervals
3. Switch to another tab → verify no poll logs while hidden
4. Switch back → verify immediate `visibility_change` refresh

## Configuration

| Setting | Default | Location | Impact |
|---------|---------|----------|--------|
| `POLL_INTERVAL_MS` | 5000ms | `lib/config.js` | Unused — board subscription uses 30s |
| Board poll interval | 30s | `TennisQueries.js:121` | Data freshness vs server load |
| Backup poll interval | 60s | `TennisQueries.js:125` | Safety net for always-visible displays |
| Refresh debounce | Dynamic | `TennisQueries.js:176` | Coalesces rapid signals |
| Assignment poll | Dynamic | `assignCourtOrchestrator.ts:507` | Wait for backend confirmation |
| `VITE_DEBUG_MODE` | `false` | `runtimeConfig.js` | Enables 500ms debug panel interval |
| E2E test mode | `false` | `?e2e=1` query param | Disables all polling |
