# Admin Blocks Module

Court blocking and scheduling management for the admin panel.

## Module Structure

```
src/admin/blocks/
├── CompleteBlockManagerEnhanced.jsx  # Main component (832 lines)
├── CourtSelectionGrid.jsx            # Presentational: 12-court grid
├── BlockReasonSelector.jsx           # Presentational: reason buttons + custom input
├── BlockTimeline.jsx                 # Timeline visualization
├── RecurrenceConfig.jsx              # Recurrence pattern configuration
├── hooks/
│   └── useWetCourts.js               # Wet court API handlers
└── utils/
    └── expandRecurrenceDates.js      # Pure recurrence date expansion
```

## Component Responsibilities

### CompleteBlockManagerEnhanced (Main)
- Owns all state (selected courts, dates, reasons, recurrence config)
- Orchestrates block creation/editing workflow
- Delegates to child components and hooks

### useWetCourts (Hook)
- Provides: `handleEmergencyWetCourt`, `deactivateWetCourts`, `clearWetCourt`
- Receives state setters as props (parent owns state)
- Makes backend API calls for wet court management

### CourtSelectionGrid (Presentational)
- Renders 12-court selection buttons
- Props: `selectedCourts`, `onToggleCourt`, `onSelectAll`, `onClearSelection`, `editingBlock`
- No internal state

### BlockReasonSelector (Presentational)
- Renders quick-reason buttons and custom input
- Owns `quickReasons` array (UI-only data)
- Props: `blockReason`, `onQuickReasonSelect`, `onOtherClick`, `showCustomReason`, `onCustomReasonChange`

### expandRecurrenceDates (Utility)
- Pure function, no React dependencies
- Input: `selectedDate`, `recurrence` config
- Output: `Array<{ date: Date }>`
- Handles daily/weekly/monthly patterns with occurrence limits

## Design Principles

1. **State stays in parent** - Child components and hooks don't own state
2. **Presentational components** - Receive data via props, emit events via callbacks
3. **Pure utilities** - No side effects, easy to test
4. **Handler providers** - Hooks provide handlers, parent provides setters
