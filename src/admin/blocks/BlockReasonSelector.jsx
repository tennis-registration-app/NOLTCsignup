/**
 * BlockReasonSelector Component
 *
 * Block reason selector with quick buttons, inline text input,
 * and wet courts toggle. Purely presentational.
 */
import React from 'react';
import { Wrench, GraduationCap, Users, Trophy, Droplets } from '../components';

const quickReasons = [
  {
    label: 'COURT WORK',
    icon: Wrench,
    color: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
  },
  {
    label: 'LESSON',
    icon: GraduationCap,
    color: 'bg-green-100 hover:bg-green-200 text-green-700',
  },
  { label: 'CLINIC', icon: Users, color: 'bg-purple-100 hover:bg-purple-200 text-purple-700' },
  { label: 'LEAGUE', icon: Trophy, color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' },
];

const BlockReasonSelector = ({
  blockReason,
  onQuickReasonSelect,
  onCustomReasonChange,
  wetCourtsActive,
  wetCourts,
  deactivateWetCourts,
  handleEmergencyWetCourt,
}) => {
  return (
    <div className="order-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4 mb-3 border-b border-gray-100 pb-2">
          <h3 className="text-lg font-semibold text-gray-800 flex-shrink-0">Block Reason</h3>
          <input
            type="text"
            value={blockReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            placeholder="Or type a custom reason..."
            className="flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <button
                  key={reason.label}
                  onClick={() => onQuickReasonSelect(reason.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    blockReason === reason.label ? 'bg-blue-600 text-white' : reason.color
                  }`}
                >
                  <Icon size={18} />
                  {reason.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex-shrink-0">
            <button
              onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
                wetCourtsActive
                  ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
                  : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
              }`}
            >
              <Droplets size={18} />
              WET COURTS
              {wetCourtsActive && wetCourts.size > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {wetCourts.size}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockReasonSelector;
