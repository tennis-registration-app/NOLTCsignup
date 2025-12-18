/**
 * InteractiveEvent Component
 *
 * Renders a clickable/hoverable calendar event with visual feedback.
 * Used by DayViewEnhanced and WeekView for displaying events.
 */
import React, { useRef } from 'react';

const InteractiveEvent = ({
  event,
  className,
  style,
  onEventClick,
  onEventHover,
  onEventLeave,
  isWeekView
}) => {
  const eventRef = useRef(null);

  const handleMouseEnter = () => {
    if (onEventHover && eventRef.current) {
      onEventHover(event, eventRef.current);
    }
  };

  return (
    <div
      ref={eventRef}
      className={`${className} cursor-pointer transition-all duration-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:z-20 hover:brightness-105`}
      style={style}
      onClick={() => onEventClick?.(event)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onEventLeave?.()}
    >
      <div className="font-medium text-xs truncate">
        {event.eventDetails?.title || event.title || event.reason}
      </div>
      {isWeekView && (
        <div className="text-xs opacity-75">
          {(() => {
            const courts = event.courtNumbers || [event.courtNumber];
            return courts.length === 1
              ? `Court ${courts[0]}`
              : `Courts ${courts.join(', ')}`;
          })()}
        </div>
      )}
    </div>
  );
};

export default InteractiveEvent;
