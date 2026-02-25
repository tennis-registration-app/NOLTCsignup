import React from 'react';
import { Check } from '../components';

/** @type {React.FC<{pendingAction: any, onConfirm: any, onCancel: any}>} */
const AIAssistantActionCard = function AIAssistantActionCard({
  pendingAction,
  onConfirm,
  onCancel,
}) {
  if (!pendingAction) return null;

  return (
    <div className="flex justify-center gap-2 mt-4">
      <button
        onClick={onConfirm}
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        <Check size={16} />
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        Cancel
      </button>
    </div>
  );
};

export default AIAssistantActionCard;
