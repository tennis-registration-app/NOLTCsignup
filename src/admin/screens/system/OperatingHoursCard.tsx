// @ts-check
import React from 'react';

/**
 * OperatingHoursCard - Weekly operating hours settings
 */
const OperatingHoursCard = ({
  operatingHours,
  hoursChanged,
  hoursSaveStatus,
  handleHoursChange,
  saveOperatingHours,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800">Regular Tennis Court Hours</h3>
      <button
        onClick={saveOperatingHours}
        disabled={!hoursChanged}
        className={`px-4 py-2 rounded text-sm font-medium ${
          hoursChanged
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : hoursSaveStatus === 'saved'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {hoursSaveStatus === 'saving'
          ? 'Saving...'
          : hoursSaveStatus === 'saved'
            ? '✓ Saved'
            : 'Save Hours'}
      </button>
    </div>
    <div className="flex flex-col gap-2">
      {operatingHours.map((day) => (
        <div
          key={day.dayOfWeek}
          className={`flex items-center gap-4 p-2 rounded-md ${
            day.isClosed ? 'bg-red-50' : 'bg-gray-50'
          }`}
        >
          <span className="w-24 font-medium">{day.dayName}</span>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={day.isClosed}
              onChange={(e) =>
                handleHoursChange(day.dayOfWeek, day.opensAt, day.closesAt, e.target.checked)
              }
            />
            Closed
          </label>
          {!day.isClosed && (
            <>
              <input
                type="time"
                value={day.opensAt?.slice(0, 5) || '06:00'}
                onChange={(e) =>
                  e.target.value &&
                  handleHoursChange(day.dayOfWeek, e.target.value + ':00', day.closesAt, false)
                }
                className="px-2 py-1 rounded border border-gray-300"
              />
              <span className="text-gray-500">to</span>
              <input
                type="time"
                value={day.closesAt?.slice(0, 5) || '21:00'}
                onChange={(e) =>
                  e.target.value &&
                  handleHoursChange(day.dayOfWeek, day.opensAt, e.target.value + ':00', false)
                }
                className="px-2 py-1 rounded border border-gray-300"
              />
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default OperatingHoursCard;
