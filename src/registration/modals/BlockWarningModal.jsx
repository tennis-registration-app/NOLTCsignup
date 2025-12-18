/**
 * BlockWarningModal Component
 *
 * Confirmation modal shown when a court has an upcoming block.
 * For blocked courts, shows unavailability message.
 * For limited time courts, allows user to proceed or select different court.
 *
 * Props:
 * - warning: { type, reason, startTime, minutesUntilBlock, limitedDuration, originalDuration } | null
 * - onConfirm: () => void - Called when user confirms selection (limited time only)
 * - onCancel: () => void - Called when user cancels/selects different court
 */
import React from 'react';

const BlockWarningModal = ({ warning, onConfirm, onCancel }) => {
  if (!warning) return null;

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isBlocked = warning.type === 'blocked';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-lg font-bold text-gray-900">
            {isBlocked ? 'Court Unavailable' : 'Limited Playing Time'}
          </h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            This court has a <strong>{warning.reason}</strong> starting at{' '}
            <strong>{formatTime(warning.startTime)}</strong>.
          </p>

          {isBlocked ? (
            <p className="text-red-600 font-medium">
              Registration is not available as the block starts in {warning.minutesUntilBlock} minutes.
            </p>
          ) : (
            <p className="text-amber-600 font-medium">
              Your playing time will be limited to <strong>{warning.limitedDuration} minutes</strong> instead
              of the usual {warning.originalDuration} minutes.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {isBlocked ? (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Select Different Court
            </button>
          ) : (
            <>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Select Different Court
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Proceed with {warning.limitedDuration} Minutes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockWarningModal;
