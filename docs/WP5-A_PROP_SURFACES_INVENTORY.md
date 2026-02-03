# WP5-A Admin Prop Surfaces Inventory

Generated: 2026-02-02
Commit: A0 (inventory only)

## Summary

| Component | Props | DATA | ACTION | SERVICE | UI |
|-----------|-------|------|--------|---------|-----|
| BlockingSection | 27 | 11 | 5 | 1 | 10 |
| CompleteBlockManagerEnhanced | 26 | 11 | 5 | 1 | 9 |
| AIAssistantSection | 22 | 5 | 10 | 1 | 6 |
| StatusSection | 18 | 7 | 8 | 1 | 2 |
| CourtStatusGrid | 18 | 7 | 9 | 1 | 1 |
| CalendarSection | 16 | 4 | 2 | 1 | 9 |
| EventCalendarEnhanced | 15 | 4 | 3 | 1 | 7 |

**Threshold**: Components with >12 props are inventoried.

## Classification Rules

- **DATA**: State values (courts, blocks, dates, flags). Read-only from component's perspective.
- **ACTION**: Event handlers (onClick, onSomething). Callbacks that modify parent state.
- **SERVICE**: Backend/API interface. Enables component to make API calls.
- **UI**: Component references, display config, feature flags. No data or side effects.

## Detailed Classifications

### BlockingSection (27 props)

Pass-through wrapper that forwards all props to CompleteBlockManagerEnhanced.

| Prop | Classification | Notes |
|------|----------------|-------|
| blockingView | DATA | Current sub-tab selection (create/future/list) |
| courts | DATA | Array of court objects from backend |
| courtBlocks | DATA | Array of block objects |
| existingBlocks | DATA | Legacy alias for courtBlocks |
| wetCourtsActive | DATA | Boolean flag for wet court mode |
| wetCourts | DATA | Set of wet court numbers |
| suspendedBlocks | DATA | Blocks paused during wet courts |
| hoursOverrides | DATA | Holiday/special hours config |
| initialEditingBlock | DATA | Block to edit (from external navigation) |
| ENABLE_WET_COURTS | DATA | Feature flag |
| onApplyBlocks | ACTION | Handler to create new blocks |
| setWetCourtsActive | ACTION | Toggle wet court mode |
| setWetCourts | ACTION | Update wet court set |
| setSuspendedBlocks | ACTION | Update suspended blocks |
| onNotification | ACTION | Show toast/notification |
| onEditingBlockConsumed | ACTION | Clear edit state after consumption |
| backend | SERVICE | TennisBackend instance |
| VisualTimeEntry | UI | Time picker component |
| MiniCalendar | UI | Date picker component |
| EventCalendarEnhanced | UI | Calendar view component |
| MonthView | UI | Month view component |
| EventSummary | UI | Event summary component |
| HoverCard | UI | Hover card component |
| QuickActionsMenu | UI | Context menu component |
| Tennis | UI | Global Tennis namespace |
| CompleteBlockManagerEnhanced | UI | Main block manager component |

**Proposed Domain Objects**:
- `blockState: { courtBlocks, existingBlocks, suspendedBlocks, initialEditingBlock }`
- `wetCourtState: { wetCourtsActive, wetCourts, ENABLE_WET_COURTS }`
- `blockActions: { onApplyBlocks, setSuspendedBlocks, onEditingBlockConsumed }`
- `wetCourtActions: { setWetCourtsActive, setWetCourts }`
- `calendarComponents: { VisualTimeEntry, MiniCalendar, EventCalendarEnhanced, MonthView, EventSummary, HoverCard, QuickActionsMenu, Tennis }`

---

### CompleteBlockManagerEnhanced (26 props)

Main block management UI with create/timeline/calendar views.

| Prop | Classification | Notes |
|------|----------------|-------|
| courts | DATA | Array of court objects |
| courtBlocks | DATA | Array of block objects (authoritative from backend) |
| existingBlocks | DATA | Legacy alias (underscore-prefixed internally) |
| wetCourtsActive | DATA | Boolean flag |
| wetCourts | DATA | Set of wet court numbers |
| suspendedBlocks | DATA | Underscore-prefixed, not used |
| hoursOverrides | DATA | Holiday/special hours |
| initialEditingBlock | DATA | Block to pre-fill form |
| ENABLE_WET_COURTS | DATA | Feature flag |
| defaultView | DATA | Initial view mode |
| onApplyBlocks | ACTION | Create blocks callback |
| setWetCourtsActive | ACTION | Toggle wet courts |
| setWetCourts | ACTION | Update wet court set |
| setSuspendedBlocks | ACTION | Update suspended blocks |
| onNotification | ACTION | Toast/notification |
| onEditingBlockConsumed | ACTION | Clear edit state |
| backend | SERVICE | TennisBackend for API calls |
| VisualTimeEntry | UI | Time picker |
| MiniCalendar | UI | Date picker |
| EventCalendarEnhanced | UI | Calendar component |
| MonthView | UI | Month view |
| EventSummary | UI | Summary panel |
| HoverCard | UI | Hover preview |
| QuickActionsMenu | UI | Context menu |
| Tennis | UI | Global namespace |

**Notes**: This component receives almost identical props to BlockingSection. The wrapper pattern suggests these could be consolidated.

---

### AIAssistantSection (22 props)

Floating AI assistant button and modal.

| Prop | Classification | Notes |
|------|----------------|-------|
| activeTab | DATA | Current admin tab (for visibility check) |
| showAIAssistant | DATA | Modal open state |
| USE_REAL_AI | DATA | Feature flag (real vs mock) |
| courts | DATA | For MockAIAdmin |
| waitingGroups | DATA | For MockAIAdmin |
| setShowAIAssistant | ACTION | Toggle modal |
| onAISettingsChanged | ACTION | Settings update callback |
| loadData | ACTION | Refresh data |
| clearCourt | ACTION | Clear a court |
| clearAllCourts | ACTION | Clear all courts |
| moveCourt | ACTION | Move players between courts |
| updateBallPrice | ACTION | Update ball price |
| refreshData | ACTION | Refresh data |
| clearWaitlist | ACTION | Clear waitlist |
| backend | SERVICE | For AIAssistant |
| AIAssistant | UI | Real AI component |
| MockAIAdmin | UI | Mock AI component |
| dataStore | UI | Data store reference |
| settings | UI | App settings object |

**Proposed Domain Objects**:
- `courtActions: { clearCourt, clearAllCourts, moveCourt }`
- `dataActions: { loadData, refreshData, clearWaitlist, updateBallPrice }`

**Notes**: This component conditionally renders either AIAssistant or MockAIAdmin, but receives props for both. Consider splitting into two focused components.

---

### StatusSection (18 props)

Court status grid with waitlist display.

| Prop | Classification | Notes |
|------|----------------|-------|
| courts | DATA | Array of court objects |
| courtBlocks | DATA | Array of blocks |
| selectedDate | DATA | Current date selection |
| currentTime | DATA | Current time (for overtime calc) |
| wetCourtsActive | DATA | Wet court mode flag |
| wetCourts | DATA | Set of wet court numbers |
| waitingGroups | DATA | Waitlist groups |
| clearCourt | ACTION | Clear a single court |
| moveCourt | ACTION | Move players |
| handleEditBlockFromStatus | ACTION | Navigate to block edit |
| handleEmergencyWetCourt | ACTION | Activate wet courts |
| clearAllCourts | ACTION | Clear all courts |
| deactivateWetCourts | ACTION | Deactivate wet courts |
| clearWetCourt | ACTION | Clear single wet court |
| moveInWaitlist | ACTION | Reorder waitlist |
| removeFromWaitlist | ACTION | Remove from waitlist |
| backend | SERVICE | Backend instance |

**Proposed Domain Objects**:
- `courtState: { courts, courtBlocks, selectedDate, currentTime }`
- `wetCourtState: { wetCourtsActive, wetCourts }`
- `courtActions: { clearCourt, moveCourt, clearAllCourts, handleEditBlockFromStatus }`
- `wetCourtActions: { handleEmergencyWetCourt, deactivateWetCourts, clearWetCourt }`
- `waitlistActions: { moveInWaitlist, removeFromWaitlist }`

---

### CourtStatusGrid (18 props)

12-court grid with status indicators and action menus.

| Prop | Classification | Notes |
|------|----------------|-------|
| courts | DATA | Array of court objects |
| courtBlocks | DATA | Array of blocks |
| selectedDate | DATA | Current date |
| currentTime | DATA | Current time |
| wetCourtsActive | DATA | Wet court mode |
| wetCourts | DATA | Set of wet courts |
| onClearCourt | ACTION | Clear court handler |
| onMoveCourt | ACTION | Move players handler |
| onEditBlock | ACTION | Edit block (underscore-prefixed) |
| onEditGame | ACTION | Edit game (underscore-prefixed) |
| onEmergencyWetCourt | ACTION | Activate wet (underscore-prefixed) |
| onClearAllCourts | ACTION | Clear all |
| handleEmergencyWetCourt | ACTION | Duplicate of onEmergencyWetCourt |
| deactivateWetCourts | ACTION | Deactivate wet courts |
| onClearWetCourt | ACTION | Clear single wet court |
| onClearAllWetCourts | ACTION | Clear all wet courts |
| backend | SERVICE | Backend for API calls |

**Notes**: Several props are underscore-prefixed (unused). Also has duplicate handlers (onEmergencyWetCourt vs handleEmergencyWetCourt). Cleanup opportunity.

---

### CalendarSection (16 props)

Thin wrapper that passes all props to EventCalendarEnhanced.

| Prop | Classification | Notes |
|------|----------------|-------|
| courts | DATA | Court array |
| currentTime | DATA | Current time |
| refreshTrigger | DATA | Force refresh counter |
| calendarView | DATA | Default view mode |
| hoursOverrides | DATA | Special hours config |
| onRefresh | ACTION | Trigger refresh |
| backend | SERVICE | Backend instance |
| MonthView | UI | Month view component |
| EventSummary | UI | Summary component |
| HoverCard | UI | Hover card component |
| QuickActionsMenu | UI | Context menu |
| Tennis | UI | Global namespace |
| EventCalendarEnhanced | UI | Calendar component |

**Notes**: Pure pass-through wrapper. Consider if this level of indirection is needed.

---

### EventCalendarEnhanced (15 props)

Main calendar with day/week/month views.

| Prop | Classification | Notes |
|------|----------------|-------|
| courts | DATA | Court array for event mapping |
| currentTime | DATA | Current time |
| refreshTrigger | DATA | Refresh counter |
| defaultView | DATA | Initial view mode |
| disableEventClick | DATA | Disable click handling |
| hoursOverrides | DATA | Special hours |
| onRefresh | ACTION | Refresh callback |
| onEditEvent | ACTION | Edit event (underscore-prefixed) |
| onDuplicateEvent | ACTION | Duplicate event |
| backend | SERVICE | Backend for block fetching |
| MonthView | UI | Month view component |
| EventSummary | UI | Summary component (underscore-prefixed) |
| HoverCard | UI | Hover preview |
| QuickActionsMenu | UI | Context menu |
| Tennis | UI | Global namespace (underscore-prefixed) |

---

## Patterns Observed

### 1. Component Injection Pattern (High Frequency)
Many UI components (MonthView, HoverCard, QuickActionsMenu, etc.) are passed as props rather than imported directly. This creates:
- **Benefit**: Dependency injection for testing
- **Cost**: Inflated prop counts, prop drilling through wrappers

**Recommendation**: Consider React Context for component injection if testing is the goal.

### 2. Wet Court State Sprawl
Wet court state appears in 4+ components with 2-3 related props each:
- `wetCourtsActive`, `wetCourts`, `ENABLE_WET_COURTS`
- `setWetCourtsActive`, `setWetCourts`, `handleEmergencyWetCourt`, `deactivateWetCourts`, `clearWetCourt`

**Recommendation**: Create `useWetCourts` context or consolidate into single `wetCourtManager` object.

### 3. Duplicate Handler Names
- `onEmergencyWetCourt` vs `handleEmergencyWetCourt` (CourtStatusGrid)
- `onClearAllWetCourts` vs `deactivateWetCourts` (same operation)

**Recommendation**: Standardize naming convention (prefer `on*` for props).

### 4. Underscore-Prefixed Unused Props
Several props are received but not used:
- `_existingBlocks`, `_suspendedBlocks` (CompleteBlockManagerEnhanced)
- `_onEditBlock`, `_onEditGame`, `_onEmergencyWetCourt` (CourtStatusGrid)
- `_onEditEvent`, `_EventSummary`, `_Tennis` (EventCalendarEnhanced)

**Recommendation**: Remove unused props from interfaces.

### 5. Pass-Through Wrappers
- BlockingSection → CompleteBlockManagerEnhanced (26/27 props passed through)
- CalendarSection → EventCalendarEnhanced (all props passed through)

**Recommendation**: Evaluate if wrapper components add value or just add indirection.

---

## Proposed Domain Object Groupings

### CourtState
```javascript
{
  courts,           // Array of court objects
  courtBlocks,      // Array of blocks
  selectedDate,     // Current date
  currentTime,      // Current time
}
```

### WetCourtState
```javascript
{
  wetCourtsActive,  // Boolean
  wetCourts,        // Set<number>
  ENABLE_WET_COURTS // Feature flag
}
```

### WetCourtActions
```javascript
{
  setWetCourtsActive,
  setWetCourts,
  handleEmergencyWetCourt,
  deactivateWetCourts,
  clearWetCourt,
}
```

### BlockState
```javascript
{
  courtBlocks,
  existingBlocks,
  suspendedBlocks,
  initialEditingBlock,
  hoursOverrides,
}
```

### BlockActions
```javascript
{
  onApplyBlocks,
  onEditingBlockConsumed,
  setSuspendedBlocks,
}
```

### CalendarComponents
```javascript
{
  VisualTimeEntry,
  MiniCalendar,
  EventCalendarEnhanced,
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
}
```

---

## Next Steps

1. **A1**: Remove unused underscore-prefixed props
2. **A2**: Consolidate duplicate handler names
3. **A3**: Create WetCourt context (if multiple consumers)
4. **A4**: Evaluate component injection pattern vs Context
5. **A5**: Consider domain object grouping for prop reduction
