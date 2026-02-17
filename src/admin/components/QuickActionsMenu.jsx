/**
 * QuickActionsMenu Component
 *
 * Context menu for event actions (edit, duplicate, delete).
 * Appears on right-click or action button click on calendar events.
 */
import React, { memo } from 'react';
import { useAdminConfirm } from '../context/ConfirmContext.jsx';

const QuickActionsMenu = memo(({ event, position, onClose, onEdit, onDelete, onDuplicate }) => {
  const confirm = useAdminConfirm();
  if (!event) return null;

  return (
    <>
      {/* Invisible overlay to close menu when clicking outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={() => {
            onEdit(event);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
        >
          <span>✏️</span>
          Edit Event
        </button>
        <button
          onClick={() => {
            onDuplicate(event);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
        >
          <span>📋</span>
          Duplicate
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button
          onClick={async () => {
            if (await confirm('Are you sure you want to delete this event?')) {
              onDelete(event);
              onClose();
            }
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"
        >
          <span>🗑️</span>
          Delete Event
        </button>
      </div>
    </>
  );
});

QuickActionsMenu.displayName = 'QuickActionsMenu';

export default QuickActionsMenu;
