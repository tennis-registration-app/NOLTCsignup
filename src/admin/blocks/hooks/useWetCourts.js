/**
 * useWetCourts Hook
 *
 * Manages wet court state and operations.
 * Extracted from CompleteBlockManagerEnhanced for maintainability.
 */
import { logger } from '../../../lib/logger.js';
import { getDeviceId } from '../../utils/getDeviceId.js';

// Get Events from window (same as parent component)
const Events = window.Events;

/**
 * @param {Object} params
 * @param {Object} params.backend - TennisBackend for API calls
 * @param {Function} params.onNotification - Notification callback
 * @param {boolean} params.ENABLE_WET_COURTS - Feature flag
 * @param {Set} params.wetCourts - Current wet courts set
 * @param {Function} params.setWetCourts - Setter for wet courts
 * @param {Function} params.setWetCourtsActive - Setter for active state
 * @param {Function} params.setSuspendedBlocks - Setter for suspended blocks
 * @param {Array} params.courts - Courts array for getting court IDs
 * @param {Function} params.setRefreshTrigger - Trigger board refresh
 */
export function useWetCourts({
  backend,
  onNotification,
  ENABLE_WET_COURTS,
  wetCourts,
  setWetCourts,
  setWetCourtsActive,
  setSuspendedBlocks,
  courts,
  setRefreshTrigger,
}) {
  // Wet Court Helper Functions - Using API
  const handleEmergencyWetCourt = async () => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      logger.error('WetCourts', 'Backend not available');
      onNotification?.('Backend not available', 'error');
      return;
    }

    logger.debug('WetCourts', 'Emergency wet court - calling API');

    try {
      const result = await backend.admin.markWetCourts({
        deviceId: getDeviceId(),
        durationMinutes: 720, // 12 hours
        reason: 'WET COURT',
        idempotencyKey: `wet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (result.ok) {
        logger.debug(
          'WetCourts',
          `Marked ${result.courtsMarked} courts as wet until ${result.endsAt}`
        );
        onNotification?.(`All ${result.courtsMarked} courts marked wet`, 'success');

        // Update local state for UI
        const allCourts = new Set(result.courtNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        setWetCourts(allCourts);
        setWetCourtsActive(true);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: Array.from(allCourts) });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        logger.error('WetCourts', 'Failed to mark wet courts', result.message);
        onNotification?.(result.message || 'Failed to mark wet courts', 'error');
      }
    } catch (error) {
      logger.error('WetCourts', 'Error marking wet courts', error);
      onNotification?.('Error marking wet courts', 'error');
    }
  };

  const deactivateWetCourts = async () => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      onNotification?.('Backend not available', 'error');
      return;
    }

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
      });

      if (result.ok) {
        logger.debug('WetCourts', `Cleared ${result.blocksCleared} wet court blocks`);
        onNotification?.(`Cleared ${result.blocksCleared} wet courts`, 'success');

        // Update local state
        setWetCourtsActive(false);
        setWetCourts(new Set());
        setSuspendedBlocks([]);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: [] });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        logger.error('WetCourts', 'Failed to clear wet courts', result.message);
        onNotification?.(result.message || 'Failed to clear wet courts', 'error');
      }
    } catch (error) {
      logger.error('WetCourts', 'Error clearing wet courts', error);
      onNotification?.('Error clearing wet courts', 'error');
    }
  };

  // Clear individual wet court via API
  const clearWetCourt = async (courtNumber) => {
    if (!ENABLE_WET_COURTS) return;
    if (!backend) {
      onNotification?.('Backend not available', 'error');
      return;
    }

    logger.debug('WetCourts', `Clearing wet court ${courtNumber}`);

    // Get court ID from courts array
    const court = courts[courtNumber - 1];
    if (!court?.id) {
      logger.error('WetCourts', `Court ${courtNumber} not found`);
      onNotification?.(`Court ${courtNumber} not found`, 'error');
      return;
    }

    try {
      const result = await backend.admin.clearWetCourts({
        deviceId: getDeviceId(),
        courtIds: [court.id],
      });

      if (result.ok) {
        // Update local UI state
        const newWetCourts = new Set(wetCourts);
        newWetCourts.delete(courtNumber);
        setWetCourts(newWetCourts);

        // Emit event for legacy components (if available)
        Events?.emitDom?.('tennisDataUpdate', { key: 'wetCourts', data: Array.from(newWetCourts) });

        // If all courts are dry, update active state
        if (newWetCourts.size === 0) {
          setWetCourtsActive(false);
        }

        onNotification?.(`Court ${courtNumber} cleared`, 'success');
      } else {
        logger.error('WetCourts', 'Failed to clear wet court', result.message);
        onNotification?.(result.message || 'Failed to clear wet court', 'error');
      }
    } catch (error) {
      logger.error('WetCourts', 'Error clearing wet court', error);
      onNotification?.('Error clearing wet court', 'error');
    }
  };

  return {
    // Handlers only - state is managed by parent
    handleEmergencyWetCourt,
    deactivateWetCourts,
    clearWetCourt,
  };
}
