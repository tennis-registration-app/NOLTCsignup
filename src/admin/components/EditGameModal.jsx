/**
 * EditGameModal Component
 *
 * Modal dialog for editing game details including players, times, and duration.
 * Used in the court management view.
 */
import React, { useState } from 'react';
import { X } from './Icons.jsx';

const EditGameModal = ({ game, onSave, onClose }) => {
  const [players, setPlayers] = useState(game.players || []);
  const [startTime, setStartTime] = useState(() => {
    const date = new Date(game.startTime);
    return date.toTimeString().slice(0, 5);
  });
  const [endTime, setEndTime] = useState(() => {
    const date = new Date(game.endTime);
    return date.toTimeString().slice(0, 5);
  });
  const [duration, setDuration] = useState(game.duration || 90);

  const handlePlayerNameChange = (index, newName) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], name: newName };
    setPlayers(newPlayers);
  };

  const handleSave = () => {
    const startDate = new Date(game.startTime);
    const [startHours, startMinutes] = startTime.split(':');
    startDate.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDate = new Date(game.endTime);
    const [endHours, endMinutes] = endTime.split(':');
    endDate.setHours(parseInt(endHours), parseInt(endMinutes));

    onSave({
      ...game,
      players,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Game - Court {game.courtNumber}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Players */}
          <div>
            <label className="block text-sm font-medium mb-2">Players</label>
            {players.map((player, index) => (
              <input
                key={index}
                type="text"
                value={player.name || ''}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-2"
                placeholder={`Player ${index + 1}`}
              />
            ))}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
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

export default EditGameModal;
