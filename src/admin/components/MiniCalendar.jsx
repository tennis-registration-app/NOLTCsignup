import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from './Icons';

export function MiniCalendar({ selectedDate, onDateSelect, minDate: _minDate = new Date() }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const changeMonth = (increment) => {
    const newMonth = new Date(viewMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setViewMonth(newMonth);
  };

  const days = getDaysInMonth(viewMonth);
  const monthYear = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-medium text-sm">{monthYear}</h3>
        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} />;
          }

          const isPast = isPastDate(date);
          const isDateToday = isToday(date);
          const isDateSelected = isSelected(date);

          return (
            <button
              key={index}
              onClick={() => !isPast && onDateSelect(date)}
              disabled={isPast}
              className={`
                      aspect-square flex items-center justify-center text-sm rounded
                      ${isDateSelected ? 'bg-blue-600 text-white font-medium' : ''}
                      ${isDateToday && !isDateSelected ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                      ${!isDateSelected && !isDateToday && !isPast ? 'hover:bg-gray-100' : ''}
                    `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
