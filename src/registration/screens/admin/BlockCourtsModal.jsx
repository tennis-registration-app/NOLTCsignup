// @ts-check
import React from 'react';

/**
 * BlockCourtsModal - Modal for blocking multiple courts
 */
const BlockCourtsModal = ({
  selectedCourtsToBlock,
  setSelectedCourtsToBlock,
  blockMessage,
  setBlockMessage,
  blockStartTime,
  setBlockStartTime,
  blockEndTime,
  setBlockEndTime,
  blockingInProgress,
  setBlockingInProgress,
  setShowBlockModal,
  onBlockCreate,
  CONSTANTS,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto modal-mobile-full">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Block Courts</h3>

      {/* Court Selection */}
      <div className="mb-4">
        <label className="block text-white mb-2 text-sm sm:text-base">Select Courts to Block</label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
          {[...Array(CONSTANTS.COURT_COUNT)].map((_, index) => {
            const courtNum = index + 1;
            const isSelected = selectedCourtsToBlock.includes(courtNum);

            return (
              <button
                key={courtNum}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCourtsToBlock(selectedCourtsToBlock.filter((c) => c !== courtNum));
                  } else {
                    setSelectedCourtsToBlock([...selectedCourtsToBlock, courtNum]);
                  }
                  setBlockingInProgress(false);
                }}
                className={`py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Court {courtNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            if (selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT) {
              setSelectedCourtsToBlock([]);
            } else {
              setSelectedCourtsToBlock([...Array(CONSTANTS.COURT_COUNT)].map((_, i) => i + 1));
            }
            setBlockingInProgress(false);
          }}
          className="text-yellow-400 text-xs sm:text-sm hover:text-yellow-300"
        >
          {selectedCourtsToBlock.length === CONSTANTS.COURT_COUNT ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Message Selection */}
      <div className="mb-4">
        <label className="block text-white mb-2 text-sm sm:text-base">Block Reason</label>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => {
              setBlockMessage('WET COURT');
              setBlockingInProgress(false);
            }}
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
              blockMessage === 'WET COURT'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            WET COURT
          </button>
          <button
            onClick={() => {
              setBlockMessage('COURT WORK');
              setBlockingInProgress(false);
            }}
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
              blockMessage === 'COURT WORK'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            COURT WORK
          </button>
          <button
            onClick={() => {
              setBlockMessage('LESSON');
              setBlockingInProgress(false);
            }}
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
              blockMessage === 'LESSON'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            LESSON
          </button>
        </div>
        <input
          type="text"
          value={blockMessage}
          onChange={(e) => {
            setBlockMessage(e.target.value);
            setBlockingInProgress(false);
          }}
          placeholder="Or enter custom message..."
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
        />
      </div>

      {/* Time Selection */}
      <div className="mb-4">
        <label className="block text-white mb-2 text-sm sm:text-base">Start Time</label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => {
              setBlockStartTime('now');
              setBlockingInProgress(false);
            }}
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm ${
              blockStartTime === 'now'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Now
          </button>
          <input
            type="time"
            value={blockStartTime === 'now' ? '' : blockStartTime}
            onChange={(e) => {
              setBlockStartTime(e.target.value);
              setBlockingInProgress(false);
            }}
            className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm sm:text-base"
          />
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-white mb-2 text-sm sm:text-base">End Time</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            onClick={() => {
              const end = new Date();
              if (blockStartTime && blockStartTime !== 'now') {
                const [hours, minutes] = blockStartTime.split(':');
                end.setHours(parseInt(hours), parseInt(minutes));
              }
              end.setHours(end.getHours() + 1);
              const endHours = end.getHours().toString().padStart(2, '0');
              const endMinutes = end.getMinutes().toString().padStart(2, '0');
              setBlockEndTime(`${endHours}:${endMinutes}`);
              setBlockingInProgress(false);
            }}
            className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
          >
            +1 hour
          </button>
          <button
            onClick={() => {
              const end = new Date();
              if (blockStartTime && blockStartTime !== 'now') {
                const [hours, minutes] = blockStartTime.split(':');
                end.setHours(parseInt(hours), parseInt(minutes));
              }
              end.setHours(end.getHours() + 2);
              const endHours = end.getHours().toString().padStart(2, '0');
              const endMinutes = end.getMinutes().toString().padStart(2, '0');
              setBlockEndTime(`${endHours}:${endMinutes}`);
            }}
            className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
          >
            +2 hours
          </button>
          <button
            onClick={() => {
              const end = new Date();
              if (blockStartTime && blockStartTime !== 'now') {
                const [hours, minutes] = blockStartTime.split(':');
                end.setHours(parseInt(hours), parseInt(minutes));
              }
              end.setHours(end.getHours() + 4);
              const endHours = end.getHours().toString().padStart(2, '0');
              const endMinutes = end.getMinutes().toString().padStart(2, '0');
              setBlockEndTime(`${endHours}:${endMinutes}`);
            }}
            className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm"
          >
            +4 hours
          </button>
        </div>
        <input
          type="time"
          value={blockEndTime}
          onChange={(e) => {
            setBlockEndTime(e.target.value);
            setBlockingInProgress(false);
          }}
          required
          className="p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-yellow-500 focus:outline-none w-full text-sm sm:text-base"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowBlockModal(false)}
          className="px-4 sm:px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm sm:text-base"
        >
          Close
        </button>
        <button
          onClick={onBlockCreate}
          disabled={blockingInProgress}
          className={`px-4 sm:px-6 py-2 rounded transition-colors text-sm sm:text-base ${
            blockingInProgress
              ? 'bg-yellow-400 text-white cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          {blockingInProgress ? 'Applied' : 'Apply Blocks'}
        </button>
      </div>
    </div>
  </div>
);

export default BlockCourtsModal;
