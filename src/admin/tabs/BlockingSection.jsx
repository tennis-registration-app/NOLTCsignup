import React, { useMemo } from 'react';
import {
  createWetCourtsModel,
  createWetCourtsActions,
  createBlockModel,
  createBlockActions,
  createBlockComponents,
  createAdminServices,
} from '../types/domainObjects.js';

export function BlockingSection({
  blockingView,
  courts,
  courtBlocks,
  onApplyBlocks,
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
  // ⚠️ useMemo prevents new object identity on every render
  const wetCourtsModel = useMemo(
    () =>
      createWetCourtsModel({
        wetCourtsActive,
        wetCourts,
        ENABLE_WET_COURTS,
      }),
    [wetCourtsActive, wetCourts, ENABLE_WET_COURTS]
  );

  const wetCourtsActions = useMemo(
    () =>
      createWetCourtsActions({
        setWetCourtsActive,
        setWetCourts,
        setSuspendedBlocks,
      }),
    [setWetCourtsActive, setWetCourts, setSuspendedBlocks]
  );

  const blockModel = useMemo(
    () =>
      createBlockModel({
        courts,
        courtBlocks,
        hoursOverrides,
        initialEditingBlock,
        suspendedBlocks,
      }),
    [courts, courtBlocks, hoursOverrides, initialEditingBlock, suspendedBlocks]
  );

  const blockActions = useMemo(
    () =>
      createBlockActions({
        onApplyBlocks,
        onEditingBlockConsumed,
        setSuspendedBlocks,
        onNotification,
      }),
    [onApplyBlocks, onEditingBlockConsumed, setSuspendedBlocks, onNotification]
  );

  const blockComponents = useMemo(
    () =>
      createBlockComponents({
        VisualTimeEntry,
        MiniCalendar,
        EventCalendarEnhanced,
        MonthView,
        EventSummary,
        HoverCard,
        QuickActionsMenu,
        Tennis,
      }),
    [
      VisualTimeEntry,
      MiniCalendar,
      EventCalendarEnhanced,
      MonthView,
      EventSummary,
      HoverCard,
      QuickActionsMenu,
      Tennis,
    ]
  );

  const adminServices = useMemo(() => createAdminServices({ backend }), [backend]);

  return (
    <div className="space-y-6 p-6 ">
      {/* Sub-tab Content */}
      {blockingView === 'create' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={blockComponents}
          services={adminServices}
          defaultView="create"
        />
      )}

      {blockingView === 'future' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={blockComponents}
          services={adminServices}
          defaultView="calendar"
        />
      )}

      {blockingView === 'list' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={blockComponents}
          services={adminServices}
          defaultView="timeline"
        />
      )}
    </div>
  );
}
