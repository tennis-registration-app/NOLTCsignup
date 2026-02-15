// @ts-check
import React from 'react';

/**
 * EditModeBanner - Shows editing indicator with cancel button
 */
const EditModeBanner = ({ editingBlock, onCancel, Edit2Icon, XIcon }) => (
  <div className="flex items-center gap-2 text-sm text-blue-600">
    <Edit2Icon size={16} />
    <span>Editing block on Court {editingBlock.courtNumber}</span>
    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
      <XIcon size={16} />
    </button>
  </div>
);

export default EditModeBanner;
