/**
 * CourtSelectionGrid Component
 *
 * 12-court selection grid for block management.
 * Purely presentational - parent owns state and toggle logic.
 */
import React from 'react';

const CourtSelectionGrid = ({
  selectedCourts,
  onToggleCourt,
  editingBlock,
  onSelectAll,
  onClearSelection,
}) => {
  return (
    <div style={{ order: 1 }}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3
          className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2"
          style={{ marginTop: '0', lineHeight: '1.75rem' }}
        >
          Select Courts to Block
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {[...Array(12)].map((_, idx) => {
            const courtNum = idx + 1;
            const isSelected = selectedCourts.includes(courtNum);

            return (
              <button
                key={courtNum}
                onClick={() => onToggleCourt(courtNum)}
                disabled={editingBlock && editingBlock.courtNumber !== courtNum}
                className={`py-2 px-3 rounded-lg font-medium transition-all shadow-sm border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                    : editingBlock && editingBlock.courtNumber !== courtNum
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                Court {courtNum}
              </button>
            );
          })}
        </div>
        {!editingBlock && (
          <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={onSelectAll} className="text-sm text-blue-600 hover:text-blue-700">
              Select All
            </button>
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtSelectionGrid;
