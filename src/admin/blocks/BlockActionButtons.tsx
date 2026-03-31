// @ts-check
import React from 'react';

/**
 * BlockActionButtons - Apply block and wet courts buttons
 */
interface BlockActionButtonsProps {
  handleBlockCourts: () => void;
  onClear: () => void;
  isValid: boolean;
  editingBlock: object | null;
  selectedCourts: number[];
  recurrence: { pattern: string } | null;
}

const BlockActionButtons = ({
  handleBlockCourts,
  onClear,
  isValid,
  editingBlock,
  selectedCourts,
  recurrence,
}: BlockActionButtonsProps) => (
  <div className="flex gap-3">
    <button
      onClick={handleBlockCourts}
      disabled={!isValid}
      data-testid="admin-block-create-btn"
      className={`flex-[2] py-3 rounded-lg font-medium transition-colors ${
        isValid
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-100 text-gray-700 border border-blue-400 cursor-not-allowed'
      }`}
    >
      {selectedCourts.length === 0 ? (
        'Select Courts to Apply'
      ) : (
        <>
          {editingBlock ? 'Update' : 'Apply'} Block to{' '}
          {selectedCourts.length <= 3
            ? `Court${selectedCourts.length !== 1 ? 's' : ''} ${selectedCourts.sort((a, b) => a - b).join(', ')}`
            : `${selectedCourts.length} Courts`}
          {recurrence &&
            ` (${recurrence.pattern.endsWith('ly') ? recurrence.pattern : recurrence.pattern + 'ly'})`}
        </>
      )}
    </button>
    <button
      onClick={onClear}
      className="flex-1 py-3 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
    >
      Clear
    </button>
  </div>
);

export default BlockActionButtons;
