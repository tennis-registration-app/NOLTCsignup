/**
 * BlockReasonSelector Component
 *
 * Block reason selector with quick buttons and custom input.
 * Purely presentational - parent owns state and handlers.
 */
import React from 'react';
import { Wrench, GraduationCap, Users, Plus } from '../components';

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
];

const BlockReasonSelector = ({
  blockReason,
  showCustomReason,
  onQuickReasonSelect,
  onOtherClick,
  onCustomReasonChange,
}) => {
  return (
    <div style={{ order: 2 }}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2">
          Block Reason
        </h3>

        <div className="space-y-3">
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

            <button
              onClick={onOtherClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm border ${
                showCustomReason
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              <Plus size={18} />
              Other
            </button>
          </div>

          {showCustomReason && (
            <input
              ref={(input) => input && input.focus()}
              type="text"
              value={blockReason}
              onChange={(e) => onCustomReasonChange(e.target.value)}
              placeholder="Enter custom reason..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockReasonSelector;
