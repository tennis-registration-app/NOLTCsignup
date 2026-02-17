/**
 * EventDetailsModal Component
 *
 * Modal for editing court blocks/events.
 * All fields are always editable - no view/edit toggle.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getEventColor } from './utils.js';
import { getPref } from '../../platform/prefsStorage.js';
import { useAdminConfirm } from '../context/ConfirmContext.jsx';

const BLOCK_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'wet', label: 'Wet Court' },
  { value: 'other', label: 'Other' },
];

const EventDetailsModal = ({ event, courts = [], backend, onClose, onSaved }) => {
  const confirmDialog = useAdminConfirm();
  // Form state
  const [courtId, setCourtId] = useState('');
  const [title, setTitle] = useState('');
  const [blockType, setBlockType] = useState('other');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [originalValues, setOriginalValues] = useState(null);
  const initialBlockTypeRef = useRef('other');

  // Get device ID
  const deviceId = useMemo(() => {
    return window.Tennis?.deviceId || getPref('deviceId') || 'admin-device';
  }, []);

  // Determine if wet block (can't change type)
  // event is pre-normalized by EventCalendarEnhanced, use camelCase
  const isWetBlock = useMemo(() => {
    if (!event) return false;
    const type = event.blockType || event.reason;
    return type === 'wet' || (event.title || '').toLowerCase().includes('wet');
  }, [event]);

  // Initialize form when event changes
  useEffect(() => {
    if (event) {
      const start = new Date(event.startTime || event.startsAt);
      const end = new Date(event.endTime || event.endsAt);

      // event is pre-normalized, use camelCase only
      const initialCourtId = event.courtId || '';
      const initialTitle = event.title || event.reason || event.eventDetails?.title || '';
      const derived = event.blockType || event.reason?.toLowerCase() || 'other';
      const initialBlockType = BLOCK_TYPES.some((t) => t.value === derived) ? derived : 'other';
      initialBlockTypeRef.current = initialBlockType;
      const initialDate = start.toISOString().slice(0, 10);
      const initialStartTime = start.toTimeString().slice(0, 5);
      const initialEndTime = end.toTimeString().slice(0, 5);

      setCourtId(initialCourtId);
      setTitle(initialTitle);
      setBlockType(initialBlockType);
      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setError('');

      // Store original values for change detection
      setOriginalValues({
        courtId: initialCourtId,
        title: initialTitle,
        blockType: initialBlockType,
        date: initialDate,
        startTime: initialStartTime,
        endTime: initialEndTime,
      });
    }
  }, [event]);

  // Build ISO timestamps from form inputs
  const buildTimestamps = () => {
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    if (endsAt <= startsAt) {
      endsAt.setDate(endsAt.getDate() + 1);
    }

    return {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  };

  // Form validation
  const isValid = useMemo(() => {
    if (!courtId || !title.trim() || !date || !startTime || !endTime) {
      return false;
    }
    try {
      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(`${date}T${endTime}:00`);
      if (endsAt <= startsAt) {
        endsAt.setDate(endsAt.getDate() + 1);
      }
      return endsAt > startsAt;
    } catch {
      return false;
    }
  }, [courtId, title, date, startTime, endTime]);

  // Change detection
  const hasChanges = useMemo(() => {
    if (!originalValues) return false;
    return (
      courtId !== originalValues.courtId ||
      title !== originalValues.title ||
      blockType !== originalValues.blockType ||
      date !== originalValues.date ||
      startTime !== originalValues.startTime ||
      endTime !== originalValues.endTime
    );
  }, [courtId, title, blockType, date, startTime, endTime, originalValues]);

  // Handle Save Changes
  const handleSaveChanges = async () => {
    if (!isValid || !backend || !event) return;

    setSaving(true);
    setError('');

    try {
      const { startsAt, endsAt } = buildTimestamps();

      const blockTypeChanged = blockType !== initialBlockTypeRef.current;
      const result = await backend.admin.updateBlock({
        blockId: event.id,
        courtId,
        ...(blockTypeChanged ? { blockType } : {}),
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

  // Handle Save as New
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
    if (!backend || !event) return;

    const courtNum = event.courtNumber || event.courtNumbers?.[0] || 'Unknown';
    if (!(await confirmDialog(`Delete this block on Court ${courtNum}?`))) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await backend.admin.cancelBlock({
        blockId: event.id,
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

  // Early return after all hooks
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Colored Header */}
        <div className={`p-6 ${getEventColor(event)}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold bg-white bg-opacity-90 px-3 py-1 rounded-lg w-full"
                placeholder="Block Title"
                disabled={saving}
              />
              <div className="mt-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white bg-opacity-90 px-2 py-1 rounded text-sm"
                  disabled={saving}
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              disabled={saving}
            >
              <span className="text-xl">✖️</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[50vh]">
          {/* Time and Location */}
          <div className="grid grid-cols-2 gap-6">
            {/* Schedule Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Schedule</h3>
              <div className="flex items-center gap-3 text-gray-600">
                <span>🕐</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                    disabled={saving}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Court</h3>
              <div className="flex items-center gap-3 text-gray-600">
                <span>🎾</span>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="px-2 py-1 border rounded text-sm flex-1"
                  disabled={saving}
                >
                  <option value="">Select Court</option>
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      Court {court.courtNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Block Type */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Block Type</h3>
            <div className="flex items-center gap-3">
              <span>📋</span>
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value)}
                className={`px-2 py-1 border rounded text-sm ${isWetBlock ? 'bg-gray-100 text-gray-500' : ''}`}
                disabled={saving || isWetBlock}
              >
                {BLOCK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {isWetBlock && (
                <span className="text-xs text-gray-500">Cannot change wet block type</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <button
            onClick={handleSaveChanges}
            disabled={saving || !isValid || !hasChanges}
            className={`flex-1 py-2 rounded-lg font-medium ${
              saving || !isValid || !hasChanges
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleSaveAsNew}
            disabled={saving || !isValid}
            className={`px-4 py-2 rounded-lg font-medium border ${
              saving || !isValid
                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                : 'border-blue-600 text-blue-600 hover:bg-blue-50'
            }`}
          >
            Save as New
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              saving
                ? 'bg-white text-red-300 border-2 border-red-200 cursor-not-allowed'
                : 'bg-white text-red-500 border-2 border-red-400 hover:bg-red-50 hover:border-red-500'
            }`}
          >
            Delete
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

EventDetailsModal.displayName = 'EventDetailsModal';

export default EventDetailsModal;
