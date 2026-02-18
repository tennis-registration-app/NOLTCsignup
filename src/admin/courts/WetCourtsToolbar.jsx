/**
 * WetCourtsToolbar — toggle wet-court mode and mark all dry.
 * Pure presentational component extracted from CourtStatusGrid.
 */
import React from 'react';
import { Droplets } from '../components';

const WetCourtsToolbar = ({
  wetCourtsActive,
  wetCourts,
  onActivateEmergency,
  onDeactivate,
  onAllCourtsDry,
}) => {
  return (
    <div className="mt-4 flex items-center gap-4">
      <button
        onClick={wetCourtsActive ? onDeactivate : onActivateEmergency}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
          wetCourtsActive
            ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
            : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
        }`}
      >
        <Droplets size={20} />
        WET COURTS
        {wetCourts && wetCourts.size > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
            {wetCourts.size}
          </span>
        )}
      </button>

      {wetCourts && wetCourts.size > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            💧 Click wet courts as they dry to resume normal operations
          </span>
          <button
            onClick={onAllCourtsDry}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
          >
            All Courts Dry
          </button>
        </div>
      )}
    </div>
  );
};

export default WetCourtsToolbar;
