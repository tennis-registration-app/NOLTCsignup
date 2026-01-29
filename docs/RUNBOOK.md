# NOLTC Tennis Registration — Operations Runbook

## Overview

This document covers deployment, kiosk hardware setup, and troubleshooting for the NOLTC Tennis Court Registration System.

## System Components

### Frontend
- **Kiosk App** — React/Vite app running on physical kiosks at the club
- **Mobile App** — Same codebase, mobile-optimized views
- **Courtboard Display** — Read-only court status display

### Backend
- **Supabase** — PostgreSQL database + Realtime subscriptions
- **Edge Functions** — Server-side business logic (court assignment, waitlist)
- **Row-Level Security (RLS)** — Access control on all tables

## Deployment

### Prerequisites
- Supabase project configured
- Environment variables set (see `docs/ENVIRONMENT.md`)

### Deploy Steps

1. **Build the application**
```bash
npm run build
```

2. **Run verification**
```bash
npm run verify
```
   All gates must pass before deployment.

3. **Deploy to hosting**
   - Deploy `dist/` folder to your hosting provider
   - Ensure environment variables are configured

4. **Verify deployment**
   - Check kiosk loads correctly
   - Verify realtime subscription connects
   - Test a registration flow

### Environment Variables

See `docs/ENVIRONMENT.md` for full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_BASE_URL` | API base URL |

## Kiosk Hardware

### Setup
1. Connect kiosk to network (Ethernet preferred for stability)
2. Configure browser to launch in kiosk/fullscreen mode
3. Point browser to registration app URL
4. Disable screen timeout/sleep

### Recommended Settings
- **Browser**: Chrome in kiosk mode (`--kiosk` flag)
- **Resolution**: 1920x1080 or tablet resolution
- **Touch**: Ensure touch events work correctly

### Kiosk Recovery
If kiosk becomes unresponsive:
1. Refresh the page (F5 or touch gesture)
2. If still stuck, restart browser
3. If persistent, check network connectivity
4. Check Supabase dashboard for service status

## Troubleshooting

### Realtime Subscription Issues

**Symptom**: Court data not updating, stale information displayed

**Diagnosis**:
```javascript
// Check browser console for:
'[TennisBackend] Board subscription active'
'[TennisBackend] Board update received'
```

**Solutions**:
1. Refresh the page to re-establish subscription
2. Check Supabase Realtime status in dashboard
3. Verify network connectivity
4. Check for WebSocket blocking (firewalls, proxies)

### Mobile Bridge Issues

**Symptom**: Mobile app not communicating with registration flow

**Diagnosis**:
- Check for `window.RegistrationUI` in console
- Look for `postMessage` events in Network tab

**Solutions**:
1. Ensure mobile wrapper is correctly injecting bridge
2. Check `mobileFlow` state in React DevTools
3. Verify `API_CONFIG.IS_MOBILE` is correctly detected

### QR Scanner Issues

**Symptom**: QR scanner not opening or not reading codes

**Diagnosis**:
- Check camera permissions in browser
- Look for errors in console related to `showQRScanner`

**Solutions**:
1. Grant camera permissions when prompted
2. Ensure HTTPS (camera requires secure context)
3. Check `locationToken` state after successful scan

### GPS/Geolocation Issues

**Symptom**: Location check failing, `gpsFailedPrompt` showing

**Diagnosis**:
- Check `checkingLocation` state
- Look for geolocation errors in console

**Solutions**:
1. Grant location permissions when prompted
2. If GPS unavailable, use QR code fallback
3. Check `getMobileGeolocation` function for error handling

### Court Assignment Failures

**Symptom**: "Failed to assign court" error

**Diagnosis**:
- Check Network tab for Edge Function response
- Look for error details in response body

**Common Causes**:
1. **Court no longer available** — Someone else assigned it
2. **Group validation failed** — Duplicate players, invalid members
3. **RLS violation** — Permission issue (check Supabase logs)
4. **Network timeout** — Retry the operation

**Solutions**:
1. Refresh data and try again
2. Check group composition for issues
3. Review Supabase Edge Function logs

### Waitlist Issues

**Symptom**: Not being called from waitlist, incorrect position

**Diagnosis**:
- Check `waitlistPosition` in state
- Verify waitlist data in `data.waitlist`

**Solutions**:
1. Refresh to get latest waitlist state
2. Check for `hasWaitlistPriority` flag
3. Review waitlist CTA computation in `useRegistrationDerived`

### Session Timeout Issues

**Symptom**: Unexpected form reset, timeout warning not showing

**Diagnosis**:
- Check `showTimeoutWarning` state
- Look for activity events being registered

**Solutions**:
1. Verify `useSessionTimeout` hook is receiving correct props
2. Check `CONSTANTS.SESSION_TIMEOUT_MS` value
3. Ensure activity listeners (click, touch, keypress) are working

### Block/Reservation Issues

**Symptom**: Courts showing as blocked unexpectedly

**Diagnosis**:
- Check `data.blocks` and `data.upcomingBlocks`
- Look for `getCourtBlockStatus` results

**Solutions**:
1. Verify block times are correct in admin
2. Check `blockWarningMinutes` setting
3. Review `computeRegistrationCourtSelection` logic

## Monitoring

### Key Metrics to Watch
- Realtime subscription connection status
- Edge Function error rates
- Court assignment success rate
- Average registration time

### Health Checks
1. **Subscription active**: Look for periodic board updates in console
2. **Data fresh**: Compare displayed data with Supabase dashboard
3. **No console errors**: Check for JavaScript errors

### Logs
- **Browser console**: Client-side errors and debug logs
- **Supabase Dashboard**: Edge Function logs, Realtime status
- **Network tab**: API call responses

## Emergency Procedures

### System Down
1. Check Supabase status page
2. Check hosting provider status
3. Verify network connectivity at club
4. Fall back to manual court assignment if needed

### Data Corruption
1. Do NOT make changes in production
2. Check Supabase backups
3. Review recent Edge Function logs for errors
4. Contact support for database restoration

### Security Incident
1. Rotate Supabase API keys immediately
2. Review RLS policies for violations
3. Check Edge Function access logs
4. Document and report the incident

## Maintenance

### Regular Tasks
- Monitor Supabase usage and quotas
- Review error logs weekly
- Update dependencies monthly (with full verification)
- Test backup restoration quarterly

### Before Club Events
- Clear any test data
- Verify all kiosks operational
- Test full registration flow
- Ensure staff knows recovery procedures
