// @ts-check
import React from 'react';

/**
 * BlockActionButtons - Apply block and wet courts buttons
 */
const BlockActionButtons = ({
  handleBlockCourts,
  isValid,
  editingBlock,
  selectedCourts,
  recurrence,
  wetCourtsActive,
  wetCourts,
  deactivateWetCourts,
  handleEmergencyWetCourt,
  DropletsIcon,
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
    <button
      onClick={handleBlockCourts}
      disabled={!isValid}
      data-testid="admin-block-create-btn"
      className={`w-full py-3 rounded-lg font-medium transition-colors ${
        isValid
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
    >
      {editingBlock ? 'Update' : 'Apply'} Block to{' '}
      {selectedCourts.length <= 3
        ? `Court${selectedCourts.length !== 1 ? 's' : ''} ${selectedCourts.sort((a, b) => a - b).join(', ')}`
        : `${selectedCourts.length} Courts`}
      {recurrence && ` (${recurrence.pattern}ly)`}
    </button>

    <button
      onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
      className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all border ${
        wetCourtsActive
          ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
          : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
      }`}
    >
      <DropletsIcon size={16} />
      WET COURTS
      {wetCourtsActive && wetCourts.size > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
          {wetCourts.size}
        </span>
      )}
    </button>
  </div>
);

export default BlockActionButtons;
