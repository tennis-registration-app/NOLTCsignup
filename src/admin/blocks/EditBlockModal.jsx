/**
 * EditBlockModal Component
 *
 * Modal dialog for editing court blocks.
 * Supports updating existing blocks or saving as new blocks.
 */
import React, { useState, useMemo } from 'react';
import { X } from '../components';

const BLOCK_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'wet', label: 'Wet Court' },
  { value: 'other', label: 'Other' },
];

const EditBlockModal = ({ block, courts, onClose, onSaved, backend }) => {
  // Extract initial values from block
  const initialStartDate = new Date(block.startTime || block.startsAt);
  const initialEndDate = new Date(block.endTime || block.endsAt);

  // State
  const [courtId, setCourtId] = useState(block.courtId || '');
  const [title, setTitle] = useState(block.title || block.reason || '');
  const [blockType, setBlockType] = useState(
    block.blockType || block.block_type || block.reason?.toLowerCase() || 'other'
  );
  const [date, setDate] = useState(initialStartDate.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialStartDate.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(initialEndDate.toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Determine if this is a wet block (can't change type)
  const isWetBlock = (block.blockType || block.block_type || block.reason) === 'wet';

  // Get device ID
  const deviceId = useMemo(() => {
    return window.Tennis?.deviceId || localStorage.getItem('deviceId') || 'admin-device';
  }, []);

  // Build ISO timestamps from date and time inputs
  const buildTimestamps = () => {
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    // Handle end time crossing midnight
    if (endsAt <= startsAt) {
      endsAt.setDate(endsAt.getDate() + 1);
    }

    return {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  };

  // Validate form
  const isValid = useMemo(() => {
    if (!courtId || !title.trim() || !date || !startTime || !endTime) {
      return false;
    }
    const { startsAt, endsAt } = buildTimestamps();
    return new Date(endsAt) > new Date(startsAt);
  }, [courtId, title, date, startTime, endTime]);

  // Handle Save Changes (update existing block)
  const handleSaveChanges = async () => {
    if (!isValid || !backend) return;

    setSaving(true);
    setError('');

    try {
      const { startsAt, endsAt } = buildTimestamps();

      const result = await backend.admin.updateBlock({
        blockId: block.id,
        courtId,
        blockType,
        title: title.trim(),
        startsAt,
        endsAt,
        deviceId,
      });

      if (result.ok) {
        onSaved?.();
        onClose();
      } else {
        setError(result.message || 'Failed to update block');
      }
    } catch (err) {
      console.error('Error updating block:', err);
      setError(err.message || 'Error updating block');
    } finally {
      setSaving(false);
    }
  };

  // Handle Save as New Block (create new, don't modify original)
  const handleSaveAsNew = async () => {
    if (!isValid || !backend) return;

    setSaving(true);
    setError('');

    try {
      const { startsAt, endsAt } = buildTimestamps();

      const result = await backend.admin.createBlock({
        courtId,
        blockType,
        title: title.trim(),
        startsAt,
        endsAt,
        deviceId,
        deviceType: 'admin',
      });

      if (result.ok) {
        onSaved?.();
        onClose();
      } else {
        setError(result.message || 'Failed to create block');
      }
    } catch (err) {
      console.error('Error creating block:', err);
      setError(err.message || 'Error creating block');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!backend) return;

    if (!window.confirm(`Delete this block on Court ${block.courtNumber}?`)) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await backend.admin.cancelBlock({
        blockId: block.id,
        deviceId,
      });

      if (result.ok) {
        onSaved?.();
        onClose();
      } else {
        setError(result.message || 'Failed to delete block');
      }
    } catch (err) {
      console.error('Error deleting block:', err);
      setError(err.message || 'Error deleting block');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Block</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Court Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Court</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={saving}
            >
              <option value="">Select Court</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  Court {court.courtNumber || court.court_number}
                </option>
              ))}
            </select>
          </div>

          {/* Block Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Block Type</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${isWetBlock ? 'bg-gray-100 text-gray-500' : ''}`}
              disabled={saving || isWetBlock}
            >
              {BLOCK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {isWetBlock && (
              <p className="text-xs text-gray-500 mt-1">Wet court block type cannot be changed</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Morning Lesson, Court Work"
              disabled={saving}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={saving}
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              />
            </div>
          </div>

          {/* Original Info (read-only) */}
          <div className="text-sm text-gray-500 pt-2 border-t">
            <p>
              Original: Court {block.courtNumber} &middot;{' '}
              {new Date(block.startTime || block.startsAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-6">
          <div className="flex gap-2">
            <button
              onClick={handleSaveChanges}
              disabled={saving || !isValid}
              className={`flex-1 py-2 rounded-lg ${
                saving || !isValid
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleSaveAsNew}
              disabled={saving || !isValid}
              className={`flex-1 py-2 rounded-lg border ${
                saving || !isValid
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Save as New
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className={`flex-1 py-2 rounded-lg ${
                saving
                  ? 'bg-red-300 text-white cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBlockModal;
