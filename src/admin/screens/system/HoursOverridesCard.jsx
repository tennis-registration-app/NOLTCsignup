// @ts-check
import React from 'react';

/**
 * HoursOverridesCard - Holiday and special hours overrides
 */
const HoursOverridesCard = ({
  hoursOverrides,
  overrideDate,
  setOverrideDate,
  overrideOpens,
  setOverrideOpens,
  overrideCloses,
  setOverrideCloses,
  overrideReason,
  setOverrideReason,
  overrideClosed,
  setOverrideClosed,
  overrideErrors,
  setOverrideErrors,
  clearOverrideError,
  validateOverrideForm,
  addHoursOverride,
  deleteHoursOverride,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6 h-full">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Holiday &amp; Special Hours</h3>

    {/* Add Override Form */}
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Add Override</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={overrideDate}
            onChange={(e) => {
              setOverrideDate(e.target.value);
              clearOverrideError('date');
            }}
            className={`w-full p-2 border rounded ${overrideErrors.date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {overrideErrors.date && (
            <p className="text-red-500 text-xs mt-1">{overrideErrors.date}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overrideClosed"
            checked={overrideClosed}
            onChange={(e) => setOverrideClosed(e.target.checked)}
          />
          <label htmlFor="overrideClosed" className="text-sm text-gray-600">
            Closed all day
          </label>
        </div>

        {!overrideClosed && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Opens</label>
              <input
                type="time"
                value={overrideOpens}
                onChange={(e) => {
                  setOverrideOpens(e.target.value);
                  clearOverrideError('times');
                }}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Closes</label>
              <input
                type="time"
                value={overrideCloses}
                onChange={(e) => {
                  setOverrideCloses(e.target.value);
                  clearOverrideError('times');
                }}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}
        {overrideErrors.times && <p className="text-red-500 text-xs">{overrideErrors.times}</p>}

        <div>
          <label className="block text-sm text-gray-600 mb-1">Reason</label>
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => {
              setOverrideReason(e.target.value);
              clearOverrideError('reason');
            }}
            placeholder="e.g., Christmas Day, Club Tournament"
            className={`w-full p-2 border rounded ${overrideErrors.reason ? 'border-red-500' : 'border-gray-300'}`}
          />
          {overrideErrors.reason && (
            <p className="text-red-500 text-xs mt-1">{overrideErrors.reason}</p>
          )}
        </div>

        <button
          onClick={() => {
            if (validateOverrideForm()) {
              addHoursOverride(
                overrideDate,
                overrideClosed ? null : overrideOpens + ':00',
                overrideClosed ? null : overrideCloses + ':00',
                overrideClosed,
                overrideReason
              );
              // Clear form
              setOverrideDate('');
              setOverrideOpens('06:00');
              setOverrideCloses('21:00');
              setOverrideReason('');
              setOverrideClosed(false);
              setOverrideErrors({});
            }
          }}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Override
        </button>
      </div>
    </div>

    {/* Existing Overrides */}
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Upcoming Overrides</h4>
      {hoursOverrides.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No overrides scheduled</p>
      ) : (
        <div className="space-y-2">
          {hoursOverrides.map((override) => (
            <div
              key={override.date}
              className={`flex items-center justify-between p-3 rounded-lg ${
                override.isClosed ? 'bg-red-50' : 'bg-gray-50'
              }`}
            >
              <div>
                <span className="font-medium">
                  {new Date(override.date + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-gray-500 mx-2">—</span>
                <span className="text-gray-600">{override.reason}</span>
                {!override.isClosed && (
                  <span className="text-gray-400 ml-2 text-sm">
                    ({override.opensAt?.slice(0, 5)} - {override.closesAt?.slice(0, 5)})
                  </span>
                )}
                {override.isClosed && (
                  <span className="text-red-600 ml-2 text-sm font-medium">CLOSED</span>
                )}
              </div>
              <button
                onClick={() => deleteHoursOverride(override.date)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default HoursOverridesCard;
