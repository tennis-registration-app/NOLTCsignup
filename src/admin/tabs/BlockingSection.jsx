import React from 'react';

export function BlockingSection({
  blockingView,
  courts,
  onApplyBlocks,
  existingBlocks,
  wetCourtsActive,
  setWetCourtsActive,
  wetCourts,
  setWetCourts,
  suspendedBlocks,
  setSuspendedBlocks,
  ENABLE_WET_COURTS,
  onNotification,
  VisualTimeEntry,
  MiniCalendar,
  EventCalendarEnhanced,
  MonthView,
  EventSummary,
  HoverCard,
  QuickActionsMenu,
  Tennis,
  backend,
  hoursOverrides,
  initialEditingBlock,
  onEditingBlockConsumed,
  CompleteBlockManagerEnhanced,
}) {
  return (
    <div className="space-y-6 p-6 ">
      {/* Sub-tab Content */}
      {blockingView === 'create' && (
        <CompleteBlockManagerEnhanced
          courts={courts}
          onApplyBlocks={onApplyBlocks}
          existingBlocks={existingBlocks}
          wetCourtsActive={wetCourtsActive}
          setWetCourtsActive={setWetCourtsActive}
          wetCourts={wetCourts}
          setWetCourts={setWetCourts}
          suspendedBlocks={suspendedBlocks}
          setSuspendedBlocks={setSuspendedBlocks}
          ENABLE_WET_COURTS={ENABLE_WET_COURTS}
          onNotification={onNotification}
          defaultView="create"
          VisualTimeEntry={VisualTimeEntry}
          MiniCalendar={MiniCalendar}
          EventCalendarEnhanced={EventCalendarEnhanced}
          MonthView={MonthView}
          EventSummary={EventSummary}
          HoverCard={HoverCard}
          QuickActionsMenu={QuickActionsMenu}
          Tennis={Tennis}
          backend={backend}
          hoursOverrides={hoursOverrides}
          initialEditingBlock={initialEditingBlock}
          onEditingBlockConsumed={onEditingBlockConsumed}
        />
      )}

      {blockingView === 'future' && (
        <CompleteBlockManagerEnhanced
          courts={courts}
          onApplyBlocks={onApplyBlocks}
          existingBlocks={existingBlocks}
          wetCourtsActive={wetCourtsActive}
          setWetCourtsActive={setWetCourtsActive}
          wetCourts={wetCourts}
          setWetCourts={setWetCourts}
          suspendedBlocks={suspendedBlocks}
          setSuspendedBlocks={setSuspendedBlocks}
          ENABLE_WET_COURTS={ENABLE_WET_COURTS}
          onNotification={onNotification}
          defaultView="calendar"
          VisualTimeEntry={VisualTimeEntry}
          MiniCalendar={MiniCalendar}
          EventCalendarEnhanced={EventCalendarEnhanced}
          MonthView={MonthView}
          EventSummary={EventSummary}
          HoverCard={HoverCard}
          QuickActionsMenu={QuickActionsMenu}
          Tennis={Tennis}
          backend={backend}
          hoursOverrides={hoursOverrides}
        />
      )}

      {blockingView === 'list' && (
        <CompleteBlockManagerEnhanced
          courts={courts}
          onApplyBlocks={onApplyBlocks}
          existingBlocks={existingBlocks}
          wetCourtsActive={wetCourtsActive}
          setWetCourtsActive={setWetCourtsActive}
          wetCourts={wetCourts}
          setWetCourts={setWetCourts}
          suspendedBlocks={suspendedBlocks}
          setSuspendedBlocks={setSuspendedBlocks}
          ENABLE_WET_COURTS={ENABLE_WET_COURTS}
          onNotification={onNotification}
          defaultView="timeline"
          VisualTimeEntry={VisualTimeEntry}
          MiniCalendar={MiniCalendar}
          EventCalendarEnhanced={EventCalendarEnhanced}
          MonthView={MonthView}
          EventSummary={EventSummary}
          HoverCard={HoverCard}
          QuickActionsMenu={QuickActionsMenu}
          Tennis={Tennis}
          backend={backend}
          hoursOverrides={hoursOverrides}
        />
      )}
    </div>
  );
}
