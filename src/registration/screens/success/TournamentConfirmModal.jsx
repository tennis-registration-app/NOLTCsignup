/**
 * TournamentConfirmModal Component
 *
 * Confirmation dialog for designating a session as a tournament match.
 */
import React from 'react';
import { logger } from '../../../lib/logger.js';

const TournamentConfirmModal = ({ sessionId, onUpdateSessionTournament, onConfirm, onClose }) => {
  const handleConfirm = async () => {
    if (!sessionId || !onUpdateSessionTournament) {
      logger.error(
        'TournamentConfirmModal',
        'Cannot set tournament - missing session ID or handler'
      );
      onClose();
      return;
    }
    try {
      const result = await onUpdateSessionTournament(sessionId, true);
      if (result?.ok) {
        onConfirm();
      } else {
        logger.error('TournamentConfirmModal', 'Tournament update failed', result?.error);
        onClose();
      }
    } catch (e) {
      logger.error('TournamentConfirmModal', 'Tournament update error', e);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        data-testid="tournament-confirm-modal"
        className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[420px] mx-4"
      >
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-4">Tournament Match</h3>
        <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
          We are registering for a Club tournament match and may play until completion.
        </p>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            Confirm
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentConfirmModal;
