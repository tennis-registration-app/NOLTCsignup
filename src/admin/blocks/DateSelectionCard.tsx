import React from 'react';
import type { ComponentType } from 'react';

interface DateSelectionCardProps {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  MiniCalendar: ComponentType<{selectedDate: Date; onDateSelect: (d: Date) => void}> | undefined;
  CalendarDaysIcon: ComponentType<{size?: number; className?: string}>;
}

/**
 * DateSelectionCard - Calendar date picker with selected date display
 */
const DateSelectionCard = ({ selectedDate, setSelectedDate, MiniCalendar, CalendarDaysIcon }: DateSelectionCardProps) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2 mt-0 leading-7">
      Select Date
    </h3>

    {MiniCalendar && <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />}

    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-sm">
        <CalendarDaysIcon size={16} className="text-gray-600" />
        <span className="font-medium">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  </div>
);

export default DateSelectionCard;
