# ApiTennisService Public Surface

This file documents the public method surface of ApiTennisService.
Used for parity verification during refactoring.

## Public Methods (captured before refactor)

### Lifecycle
- [ ] constructor
- [ ] destroy

### Internal (private, start with _)
- [ ] _setupRealtime
- [ ] _notifyListeners
- [ ] _transformCourts
- [ ] _transformWaitlist

### Event Listeners
- [ ] addListener

### Data Loading
- [ ] loadInitialData
- [ ] refreshCourtData
- [ ] refreshWaitlist

### Court Queries
- [ ] getAvailableCourts
- [ ] getAllCourts
- [ ] getCourtByNumber

### Court Operations
- [ ] assignCourt
- [ ] clearCourt

### Ball Purchases
- [ ] purchaseBalls

### Waitlist Operations
- [ ] getWaitlist
- [ ] addToWaitlist
- [ ] removeFromWaitlist
- [ ] assignFromWaitlist

### Member Operations
- [ ] searchMembers
- [ ] getMembersByAccount
- [ ] getAllMembers

### Settings
- [ ] getSettings
- [ ] refreshSettings

## Factory Exports

- [ ] getApiTennisService()
- [ ] resetApiTennisService()
- [ ] export { ApiTennisService }
- [ ] export default ApiTennisService

## Verification Checklist (run after each phase)

```javascript
// Quick parity check - paste in test or browser console
const service = getApiTennisService();
console.log('assignCourt:', typeof service.assignCourt === 'function');
console.log('addToWaitlist:', typeof service.addToWaitlist === 'function');
console.log('loadInitialData:', typeof service.loadInitialData === 'function');
console.log('getWaitlist:', typeof service.getWaitlist === 'function');
console.log('clearCourt:', typeof service.clearCourt === 'function');
console.log('getAllCourts:', typeof service.getAllCourts === 'function');
console.log('removeFromWaitlist:', typeof service.removeFromWaitlist === 'function');
console.log('assignFromWaitlist:', typeof service.assignFromWaitlist === 'function');
console.log('searchMembers:', typeof service.searchMembers === 'function');
console.log('getSettings:', typeof service.getSettings === 'function');
console.log('purchaseBalls:', typeof service.purchaseBalls === 'function');
console.log('destroy:', typeof service.destroy === 'function');
```

## External Call Sites (captured before refactor)

| File | Methods Called |
|------|----------------|
| `useTennisService.js` | `assignCourt`, `clearCourt`, `addToWaitlist`, `removeFromWaitlist`, `assignFromWaitlist`, `getWaitlist` |
| `useRegistrationDataLayer.js` | `getTennisService()` factory |
| `TennisCommands.js` | Via backend wrapper |
| `waitlistOperations.js` | Via backend wrapper |
| `assignCourtOrchestrator.js` | Via backend wrapper |
| `useMobileFlowController.js` | Via backend wrapper |

## Notes

- No behavior changes allowed
- Legacy compatibility preserved indefinitely
- All files must remain < 500 lines
- Transformation logic moving to `src/registration/services/legacy/`
