/**
 * EditGameModal Component
 *
 * Modal dialog for editing game details including players and end time.
 * Used in the court management view.
 */
import React, { useState } from 'react';
import { X } from './Icons.jsx';

const EditGameModal = ({ game, onSave, onClose, saving = false }) => {
  // Initialize 4 player slots, pre-filled with existing players
  const existingPlayers = game.players || [];
  const [playerNames, setPlayerNames] = useState(() => {
    const names = ['', '', '', ''];
    existingPlayers.forEach((p, i) => {
      if (i < 4) {
        names[i] = p.displayName || p.name || p.playerName || '';
      }
    });
    return names;
  });

  const [endTime, setEndTime] = useState(() => {
    const date = new Date(game.endTime);
    return date.toTimeString().slice(0, 5);
  });

  const [noEndTime, setNoEndTime] = useState(false);

  const handlePlayerNameChange = (index, newName) => {
    const newNames = [...playerNames];
    newNames[index] = newName;
    setPlayerNames(newNames);
  };

  const handleSave = () => {
    // Build participants array from non-empty player names
    const participants = playerNames
      .filter((name) => name.trim())
      .map((name) => ({
        name: name.trim(),
        type: 'member', // Backend will try to match to member, fallback to guest
      }));

    // Calculate scheduled end time
    let scheduledEndAt = null;
    if (!noEndTime) {
      const endDate = new Date(game.endTime);
      const [endHours, endMinutes] = endTime.split(':');
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      scheduledEndAt = endDate.toISOString();
    }

    onSave({
      sessionId: game.sessionId || game.id,
      courtNumber: game.courtNumber,
      participants,
      scheduledEndAt,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Game - Court {game.courtNumber}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Players - always show 4 slots */}
          <div>
            <label className="block text-sm font-medium mb-2">Players</label>
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                type="text"
                value={playerNames[index]}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-2"
                placeholder={`Player ${index + 1}`}
                disabled={saving}
              />
            ))}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <div className="flex items-center gap-4">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-lg ${noEndTime ? 'bg-gray-100 text-gray-400' : ''}`}
                disabled={noEndTime || saving}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noEndTime}
                  onChange={(e) => setNoEndTime(e.target.checked)}
                  className="w-4 h-4"
                  disabled={saving}
                />
                No end time
              </label>
            </div>
            {noEndTime && (
              <p className="text-xs text-gray-500 mt-1">Session will end at midnight</p>
            )}
          </div>

          {/* Start Time (read-only) */}
          <div className="text-sm text-gray-500">
            Started at:{' '}
            {new Date(game.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-2 rounded-lg ${
              saving
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGameModal;
