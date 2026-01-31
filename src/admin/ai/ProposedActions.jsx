import React, { useState } from 'react';

/**
 * Renders proposed actions from AI and handles confirmation/execution
 */
export default function ProposedActions({
  actions,
  requiresConfirmation: _requiresConfirmation,
  onExecute,
  onCancel,
  loading,
}) {
  const [confirmed, setConfirmed] = useState(false);

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
            High Risk
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Low Risk
          </span>
        );
      case 'read':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
            Read Only
          </span>
        );
      default:
        return null;
    }
  };

  const hasHighRisk = actions.some((a) => a.risk === 'high');

  return (
    <div className="border-t bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="font-semibold text-amber-800">Proposed Actions</h3>
      </div>

      <div className="bg-white rounded border border-amber-200 mb-4 max-h-48 overflow-y-auto">
        <ul className="divide-y divide-amber-100">
          {actions.map((action, idx) => (
            <li
              key={action.id || idx}
              className="px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-gray-400 font-mono">{action.tool}</span>
                <span className="text-gray-900 truncate">{action.description}</span>
              </div>
              {getRiskBadge(action.risk)}
            </li>
          ))}
        </ul>
      </div>

      {/* Confirmation checkbox for high-risk actions */}
      {hasHighRisk && (
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            disabled={loading}
          />
          <span className="text-sm text-gray-700">
            I confirm I want to execute these high-risk actions
          </span>
        </label>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onExecute(confirmed)}
          disabled={loading || (hasHighRisk && !confirmed)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Executing...' : 'Execute Actions'}
        </button>
      </div>
    </div>
  );
}
