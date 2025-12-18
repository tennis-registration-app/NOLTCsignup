/**
 * EditBlockModal Component
 *
 * Quick edit modal for scheduled blocks.
 */
import React, { useState } from 'react';
import { X } from '../components';

const EditBlockModal = ({ block, onSave, onClose, onEditInBlockManager }) => {
  const [reason, setReason] = useState(block.reason);
  const [endTime, setEndTime] = useState(() => {
    const date = new Date(block.endTime);
    return date.toTimeString().slice(0, 5);
  });

  const handleQuickSave = () => {
    const endDate = new Date(block.endTime);
    const [endHours, endMinutes] = endTime.split(':');
    endDate.setHours(parseInt(endHours), parseInt(endMinutes));

    onSave({
      ...block,
      reason,
      endTime: endDate.toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Block - Court {block.courtNumber}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Block Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Block Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., MAINTENANCE, WET COURT"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Advanced Edit Option */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              For more options (recurrence, multiple courts, etc.), use the full block editor.
            </p>
            <button
              onClick={onEditInBlockManager}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Open in Block Manager →
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleQuickSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBlockModal;
