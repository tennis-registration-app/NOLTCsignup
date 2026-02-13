/**
 * ConflictDetector Component
 *
 * Detects scheduling conflicts when creating/editing blocks.
 * Shows warnings for overlapping blocks and active sessions.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle } from '../../components';

const ConflictDetector = ({
  courts,
  courtBlocks = [],
  selectedCourts,
  startTime,
  endTime,
  selectedDate,
  editingBlock,
}) => {
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (!selectedCourts.length || !startTime || !endTime) {
      setConflicts([]);
      return;
    }

    const detectedConflicts = [];

    selectedCourts.forEach((courtNum) => {
      const court = courts[courtNum - 1];
      if (!court) return;

      let blockStart, blockEnd;

      if (startTime === 'now') {
        blockStart = new Date();
      } else {
        blockStart = new Date(selectedDate);
        const [hours, minutes] = startTime.split(':');
        blockStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      blockEnd = new Date(selectedDate);
      const [endHours, endMinutes] = endTime.split(':');
      blockEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      if (blockEnd < blockStart) {
        blockEnd.setDate(blockEnd.getDate() + 1);
      }

      // Check for existing blocks from props (authoritative source: backend via useBoardSubscription)
      courtBlocks.forEach((block) => {
        if (block.courtNumber === courtNum && (!editingBlock || block.id !== editingBlock.id)) {
          const existingStart = new Date(block.startTime);
          const existingEnd = new Date(block.endTime);

          if (
            (blockStart >= existingStart && blockStart < existingEnd) ||
            (blockEnd > existingStart && blockEnd <= existingEnd) ||
            (blockStart <= existingStart && blockEnd >= existingEnd)
          ) {
            detectedConflicts.push({
              courtNumber: courtNum,
              type: 'block',
              reason: block.reason,
              time: `${existingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${existingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            });
          }
        }
      });

      // Check session using Domain format: court.session.group.players
      const sessionPlayers = court?.session?.group?.players;
      if (sessionPlayers) {
        const bookingStart = new Date(court.session.startedAt);
        const bookingEnd = new Date(court.session.scheduledEndAt);

        if (
          (blockStart >= bookingStart && blockStart < bookingEnd) ||
          (blockEnd > bookingStart && blockEnd <= bookingEnd) ||
          (blockStart <= bookingStart && blockEnd >= bookingEnd)
        ) {
          detectedConflicts.push({
            courtNumber: courtNum,
            type: 'booking',
            players: sessionPlayers.map((p) => p.name),
            time: `${bookingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${bookingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          });
        }
      }
    });

    setConflicts(detectedConflicts);
  }, [courts, courtBlocks, selectedCourts, startTime, endTime, selectedDate, editingBlock]);

  if (conflicts.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-900 mb-2">Conflicts Detected</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="text-sm text-yellow-800">
                <span className="font-medium">Court {conflict.courtNumber}</span>
                {conflict.type === 'block' ? (
                  <span>
                    : Already blocked ({conflict.reason}) at {conflict.time}
                  </span>
                ) : (
                  <span>
                    : Booked by {conflict.players.join(', ')} at {conflict.time}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-yellow-700">
            You can still create this block, but existing bookings will need to be handled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConflictDetector;
