# Ops Readiness Evidence

## ErrorBoundary usage

## Console logging / logger usage

## Runbook / operations docs
16:-rw-r--r--@  1 claudewilliams  staff   6659 Jan 31 13:29 RUNBOOK.md
docs/DEPLOYMENT.md:74:variables, feature flags, and troubleshooting guidance.
docs/error-contracts.md:44:4. **Attach cause**: Original error is preserved for debugging (never display to users)
docs/ENVIRONMENT.md:36:| `VITE_DEBUG_MODE` | `false` | Set to `"true"` for verbose logging |
docs/ENVIRONMENT.md:105:## Troubleshooting
docs/ENVIRONMENT.md:124:- ✅ VITE_DEBUG_MODE=true
docs/ENVIRONMENT.md:125:- ❌ VITE_DEBUG_MODE=1
docs/ENVIRONMENT.md:138:logger.debug('ModuleName', 'Operation description', optionalData);
docs/ENVIRONMENT.md:155:| `debug` | Development tracing, state changes, operation progress |
docs/ENVIRONMENT.md:169:### Enabling Debug Output
docs/ENVIRONMENT.md:171:Set `VITE_DEBUG_MODE=true` in your environment to enable verbose logging in the browser console.
docs/architecture.md:24:- `healthCheck.js` — iframe health monitoring,
docs/architecture.md:25:  debug-only selfTest (?debug=1)
docs/architecture.md:100:Consumers (logging, monitoring, admin tools) should
docs/RUNBOOK.md:1:# NOLTC Tennis Registration — Operations Runbook
docs/RUNBOOK.md:5:This document covers deployment, kiosk hardware setup, and troubleshooting for the NOLTC Tennis Court Registration System.
docs/RUNBOOK.md:77:## Troubleshooting
docs/RUNBOOK.md:193:## Monitoring
docs/RUNBOOK.md:207:- **Browser console**: Client-side errors and debug logs
docs/RUNBOOK.md:225:### Security Incident
docs/RUNBOOK.md:229:4. Document and report the incident
docs/RUNBOOK.md:234:- Monitor Supabase usage and quotas
docs/WINDOW_GLOBALS.md:113:| `src/courtboard/debug-panel.js` | Debug panel (reads only) |
docs/internal/wp5-b-error-inventory.md:141:5. **Error logging**: All catch blocks log before rethrowing, which is good for debugging.
docs/internal/WP5-C_LOCALSTORAGE_INVENTORY.md:20:- **UI PREF**: View state, filters, theme, debug settings. No backend equivalent.
docs/internal/WP5-C_LOCALSTORAGE_INVENTORY.md:54:| `src/lib/logger.js` | 67 | getItem | `'NOLTC_LOG_LEVEL'` | UI PREF | C2: wrap — debug log level |
docs/internal/WP5-C_LOCALSTORAGE_INVENTORY.md:147:- Keep debug toggles (NOLTC_LOG_LEVEL, NOLTC_USE_API) but wrap them
docs/internal/ORCHESTRATION.md:117:- `logger.debug('AssignCourt', ...)` — diagnostic logging
docs/internal/WP4-4_NAMING_INVENTORY.md:168:**Note:** Debug panel - may be acceptable for raw API display.
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:39:These are in `vite.config.js` rollupOptions.input, so they're intentionally built. Decision: Keep for debugging or remove if not used.
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:67:## D2 — Debug Artifacts
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:76:| `console.debug` | 0 | ✅ |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:77:| `debugger` | 0 | ✅ |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:81:### 🟡 Shared/Domain Directories — Intentional Debug Output
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:85:| `shared/events.js` | 5 | Error handling + debug | 🟢 Intentional (guarded by debug flag) |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:86:| `shared/domain/roster.js` | 3 | Debug logging | 🟡 Review — appears to be debug leftovers |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:88:| `domain/availability.js` | 3 | Debug logging | 🟡 Review — "SUSPICIOUS" logging |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:94:1. **`shared/domain/roster.js:184,197`** — Debug console.log for `findEngagementFor`
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:99:   **Recommendation:** 🟡 Remove or guard with debug flag
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:101:2. **`domain/availability.js:240,440,455`** — Debug logging for court selection
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:107:   **Recommendation:** 🟡 Remove or guard with debug flag (these look like development debug statements)
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:111:Searched for: `BYPASS`, `FORCE_`, `TEST_`, `DEBUG_`, `SKIP_`
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:161:| `src/courtboard/debug-panel.js` | Plain JS (IIFE) | 🟢 Intentional |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:286:| Debug console.log | `shared/domain/roster.js:184,197` | Remove or guard |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:287:| Debug console.log | `domain/availability.js:240,440,455` | Remove or guard |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:299:| console.* in events.js | `shared/events.js` | Error boundaries + debug flag |
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:314:2. **Remove debug console.log in roster.js:**
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:315:   Lines 184 and 197 — remove or wrap in debug flag
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:317:3. **Remove debug console.log in availability.js:**
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:318:   Lines 240, 440, 455 — remove or wrap in debug flag
docs/internal/WP6-B_PROTOTYPE_CLEANUP_AUDIT.md:322:1. **Test directories:** Keep for debugging or remove if unused
docs/internal/WP4-3_WINDOW_GLOBALS.md:64:| src/courtboard/debug-panel.js | 5 | No | IIFE, reads Tennis |
docs/internal/WP4-3_WINDOW_GLOBALS.md:118:| src/courtboard/debug-panel.js | 0 | 5 (Tennis, addEventListener) | Plain JS IIFE, no ES imports |
docs/internal/WP6-A_SECURITY_AUDIT.md:75:| `VITE_DEBUG_MODE` | `src/config/runtimeConfig.js` | 97 | Debug logging flag |
docs/internal/WP6-A_SECURITY_AUDIT.md:76:| `VITE_DEBUG_MODE` | `src/lib/logger.js` | 45 | Debug logging flag |
docs/internal/WP4-2_DEPS_REFACTOR.md:348:| 35 | dbg | service | Debug logging utility |
