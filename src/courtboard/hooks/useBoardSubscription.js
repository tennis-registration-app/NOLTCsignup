import { useState, useEffect } from 'react';
import { logger } from '../../lib/logger.js';
import { createBackend } from '../../lib/backend/index.js';
import { computeRegistrationCourtSelection } from '../../shared/courts/overtimeEligibility.js';

const backend = createBackend();

/**
 * Subscribes to TennisBackend real-time board changes.
 * Transforms API data into domain format for Courtboard rendering.
 *
 * Returns: { courts, waitlist, courtBlocks, upcomingBlocks, courtSelection, operatingHours }
 */
export function useBoardSubscription() {
  const [courts, setCourts] = useState(Array(12).fill(null));
  const [waitlist, setWaitlist] = useState([]);
  const [courtBlocks, setCourtBlocks] = useState([]);
  const [upcomingBlocks, setUpcomingBlocks] = useState([]);
  const [courtSelection, setCourtSelection] = useState(null);
  const [operatingHours, setOperatingHours] = useState([]);

  useEffect(() => {
    logger.debug('CourtDisplay', 'Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges(
      (domainBoard) => {
        // Use pure Domain Board directly (legacy adapter removed)
        const board = domainBoard;

        logger.debug('CourtDisplay', 'Board update received', {
          serverNow: board.serverNow,
          courts: board.courts?.length,
          waitlist: board.waitlist?.length,
          upcomingBlocks: board.upcomingBlocks?.length,
        });
        logger.debug('CourtDisplay', 'Raw upcomingBlocks', board.upcomingBlocks);

        // Debug: log first 2 courts to see raw data
        logger.debug('CourtDisplay', 'Raw board courts (first 2)', board.courts?.slice(0, 2));

        // Update courts state
        if (board.courts) {
          // Transform API courts to Domain format for Courtboard rendering
          // Domain format: court.session = { group: { players }, scheduledEndAt, startedAt }
          const transformedCourts = Array(12)
            .fill(null)
            .map((_, idx) => {
              const courtNumber = idx + 1;
              const apiCourt = board.courts.find((c) => c && c.number === courtNumber);
              if (!apiCourt) {
                return null; // Empty court
              }
              if (!apiCourt.session && !apiCourt.block) {
                return null; // No session or block
              }

              const players = (
                apiCourt.session?.participants ||
                apiCourt.session?.group?.players ||
                []
              ).map((p) => ({
                name: p.displayName || p.name || 'Unknown',
              }));

              return {
                session: apiCourt.session
                  ? {
                      group: { players },
                      scheduledEndAt: apiCourt.session.scheduledEndAt,
                      startedAt: apiCourt.session.startedAt,
                      isTournament: apiCourt.session.isTournament ?? false,
                    }
                  : null,
              };
            });

          // Debug: log first 2 transformed courts
          logger.debug(
            'CourtDisplay',
            'Transformed courts (first 2)',
            transformedCourts.slice(0, 2)
          );
          setCourts(transformedCourts);

          // Extract active blocks from courts (for availability calculations)
          const activeBlocks = board.courts
            .filter((c) => c && c.block)
            .map((c) => ({
              id: c.block.id,
              courtNumber: c.number,
              reason: c.block.reason || c.block.title || 'Blocked',
              startTime: c.block.startsAt,
              endTime: c.block.endsAt,
              isWetCourt: c.block.reason?.toLowerCase().includes('wet'),
            }));
          setCourtBlocks(activeBlocks);

          // Extract upcoming blocks from API (future blocks for today, display only)
          const futureBlocks = (board.upcomingBlocks || []).map((b) => ({
            id: b.id,
            courtNumber: b.courtNumber,
            reason: b.title || b.reason || 'Blocked',
            startTime: b.startTime,
            endTime: b.endTime,
            isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
          }));
          setUpcomingBlocks(futureBlocks);

          // Compute court selection using canonical API
          const allBlocks = [...activeBlocks, ...futureBlocks];
          const selection = computeRegistrationCourtSelection(board.courts || [], allBlocks);
          setCourtSelection(selection);
        }

        // Transform already-normalized waitlist from TennisQueries
        // TennisQueries returns { group: { players } } format, we need { names } for rendering
        const normalized = (board.waitlist || []).map((entry) => ({
          id: entry.id,
          position: entry.position,
          groupType: entry.group?.type,
          joinedAt: entry.joinedAt,
          minutesWaiting: entry.minutesWaiting,
          names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
          players: entry.group?.players || [],
          deferred: entry.deferred ?? false,
        }));
        logger.debug('CourtDisplay', 'Transformed waitlist', normalized);
        setWaitlist(normalized);

        // Set operating hours from board data
        if (board.operatingHours) {
          setOperatingHours(board.operatingHours);
        }
      },
      { pollIntervalMs: 5000 }
    );

    logger.debug('CourtDisplay', 'TennisBackend subscription active');

    return () => {
      logger.debug('CourtDisplay', 'Unsubscribing from board updates');
      unsubscribe();
    };
  }, []);

  return { courts, waitlist, courtBlocks, upcomingBlocks, courtSelection, operatingHours };
}
