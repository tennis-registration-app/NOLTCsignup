import React, { useState, useEffect, useCallback } from 'react';
import { useAdminConfirm } from '../context/ConfirmContext.jsx';
import { logger } from '../../lib/logger.js';
import { formatTo12h } from '../../components/admin/SmartTimeRangePicker';

const BLOCK_TYPE_LABELS = {
  lesson: 'LESSON',
  clinic: 'CLINIC',
  maintenance: 'MAINTENANCE',
  wet: 'WET COURT',
  other: 'OTHER',
};

const BLOCK_TYPE_COLORS = {
  lesson: 'bg-purple-100 text-purple-700',
  clinic: 'bg-green-100 text-green-700',
  maintenance: 'bg-orange-100 text-orange-700',
  wet: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-700',
};

function formatDateShort(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeFromISO(isoString) {
  const d = new Date(isoString);
  return formatTo12h(
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  );
}

const ManageRecurringPanel = ({ backend, onNotification, onRefresh }) => {
  const confirm = useAdminConfirm();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!backend) return;
    setIsLoading(true);
    try {
      const result = await backend.admin.listBlockGroups();
      if (result.ok) {
        setGroups(result.groups);
      } else {
        logger.error('ManageRecurring', 'Failed to load groups', result.message);
      }
    } catch (err) {
      logger.error('ManageRecurring', 'Error loading groups', err);
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDeleteAll = async (group) => {
    const confirmed = await confirm(`Delete all ${group.blockCount} blocks in this series?`);
    if (!confirmed) return;

    try {
      const result = await backend.admin.cancelBlockGroup({
        recurrenceGroupId: group.recurrenceGroupId,
        futureOnly: false,
      });
      if (result.ok) {
        onNotification(`Cancelled ${result.cancelledCount} blocks`, 'success');
        fetchGroups();
        onRefresh();
      } else {
        onNotification('Failed to delete blocks: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (err) {
      onNotification('Error deleting blocks: ' + err.message, 'error');
    }
  };

  const handleDeleteFuture = async (group) => {
    const confirmed = await confirm(`Delete ${group.futureCount} future blocks in this series?`);
    if (!confirmed) return;

    try {
      const result = await backend.admin.cancelBlockGroup({
        recurrenceGroupId: group.recurrenceGroupId,
        futureOnly: true,
      });
      if (result.ok) {
        onNotification(`Cancelled ${result.cancelledCount} blocks`, 'success');
        fetchGroups();
        onRefresh();
      } else {
        onNotification('Failed to delete blocks: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (err) {
      onNotification('Error deleting blocks: ' + err.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">Loading recurring groups...</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">No recurring block groups found</div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const typeLabel = BLOCK_TYPE_LABELS[group.blockType] || group.blockType;
        const typeColor = BLOCK_TYPE_COLORS[group.blockType] || BLOCK_TYPE_COLORS.other;

        return (
          <div
            key={group.recurrenceGroupId}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                    {typeLabel}
                  </span>
                  <span className="font-medium text-gray-900 truncate">{group.title}</span>
                </div>
                <div className="text-sm text-gray-600">Courts {group.courtNumbers.join(', ')}</div>
                <div className="text-sm text-gray-500">
                  {formatTimeFromISO(group.timeStart)} – {formatTimeFromISO(group.timeEnd)}
                </div>
                <div className="text-sm text-gray-500">
                  {group.blockCount} blocks ({formatDateShort(group.firstStart)} –{' '}
                  {formatDateShort(group.lastStart)})
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDeleteAll(group)}
                  className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete All
                </button>
                {group.futureCount > 0 && (
                  <button
                    onClick={() => handleDeleteFuture(group)}
                    className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    Delete Future
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ManageRecurringPanel;
