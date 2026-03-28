// @ts-check
import React from 'react';

/**
 * WetCourtManagementPanel - Wet court status grid and controls
 */
const WetCourtManagementPanel = ({ wetCourts, clearWetCourt, deactivateWetCourts }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-medium text-red-900">🌧️ Wet Court Conditions</h4>
      <span className="text-sm text-red-700">{12 - wetCourts.size}/12 courts operational</span>
    </div>

    <p className="text-sm text-red-800 mb-4">
      Click courts below as they dry to resume normal operations.
    </p>

    {/* Court Grid */}
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((courtNum) => {
        const isWet = wetCourts.has(courtNum);
        return (
          <button
            key={courtNum}
            onClick={() => clearWetCourt(courtNum)}
            className={`p-2 rounded text-sm font-medium transition-all ${
              isWet
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            Court {courtNum}
            <div className="text-xs mt-1">{isWet ? '💧 Wet' : '☀️ Dry'}</div>
          </button>
        );
      })}
    </div>

    {/* Quick Action */}
    <button
      onClick={() => {
        deactivateWetCourts();
      }}
      className="w-full py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
    >
      ✅ All Courts Dry - Resume Normal Operations
    </button>
  </div>
);

export default WetCourtManagementPanel;
