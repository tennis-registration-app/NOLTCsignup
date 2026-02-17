import React, { useEffect } from 'react';

// TennisBackend for clear court functionality
import { createBackend } from '../../registration/backend/index.js';
import {
  getTennisStorage,
  getTennisDomain,
  getTennisNamespaceConfig,
} from '../../platform/windowBridge.js';
const backend = createBackend();

/**
 * MobileModalSheet Component - handles rendering modal content
 * Displays various modal types for mobile view (court conditions, roster, etc.)
 */
export function MobileModalSheet({ type, payload, onClose }) {
  // Focus trap & return focus
  useEffect(() => {
    const opener = document.activeElement;
    return () => opener?.focus();
  }, []);

  // Scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard handlers (scoped to modal only)
  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const getTitle = () => {
    switch (type) {
      case 'court-conditions':
        return 'Court Conditions';
      case 'roster':
        return 'Member Roster';
      case 'reserved':
        return 'Reserved Courts';
      case 'waitlist':
        return 'Waitlist';
      case 'clear-court-confirm':
        return `Clear Court ${payload?.courtNumber || ''}?`;
      case 'waitlist-available':
        return 'Court Available!';
      default:
        return '';
    }
  };

  const getBodyContent = () => {
    switch (type) {
      case 'court-conditions': {
        // Court conditions with iframe
        const wetCourtsUrl = 'https://camera.noltc.com/courtconditions.html';
        return (
          <div className="modal-court-conditions">
            <iframe
              src={wetCourtsUrl}
              title="Court Conditions"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            <button
              className="court-conditions-close"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>
        );
      }

      case 'roster': {
        // Member roster display
        let rosterData = [];
        try {
          // Use storage wrapper or test data only (no direct localStorage fallbacks)
          const S = getTennisStorage();
          rosterData =
            window.__memberRoster ||
            (S?.readJSON ? S.readJSON('tennisMembers') : null) ||
            (S?.readJSON ? S.readJSON('members') : null) ||
            [];

          // If no data found, use test data
          if (!rosterData || rosterData.length === 0) {
            const names = [
              'Novak Djokovic',
              'Carlos Alcaraz',
              'Jannik Sinner',
              'Daniil Medvedev',
              'Alexander Zverev',
              'Andrey Rublev',
              'Casper Ruud',
              'Hubert Hurkacz',
              'Taylor Fritz',
              'Alex de Minaur',
              'Iga Swiatek',
              'Aryna Sabalenka',
              'Coco Gauff',
              'Elena Rybakina',
              'Jessica Pegula',
              'Ons Jabeur',
              'Marketa Vondrousova',
              'Karolina Muchova',
              'Beatriz Haddad Maia',
              'Petra Kvitova',
            ];
            rosterData = names.map((name, i) => ({
              id: 1000 + i + 1,
              name: name,
              memberNumber: String(1000 + i + 1),
              memberId: `m_${1000 + i + 1}`,
            }));
          }
        } catch (e) {
          console.warn('Failed to load roster data:', e);
          rosterData = [];
        }

        // Sort alphabetically by last name
        const sortedRoster = [...rosterData].sort((a, b) => {
          const getLastName = (fullName) => {
            const parts = (fullName || '').trim().split(' ');
            return parts[parts.length - 1] || '';
          };
          const lastNameA = getLastName(a.name || a.fullName).toLowerCase();
          const lastNameB = getLastName(b.name || b.fullName).toLowerCase();
          if (lastNameA === lastNameB) {
            const firstNameA = (a.name || a.fullName || '').toLowerCase();
            const firstNameB = (b.name || b.fullName || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
          }
          return lastNameA.localeCompare(lastNameB);
        });

        return (
          <div className="modal-roster">
            {sortedRoster.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-gray-400">No member data available.</p>
              </div>
            ) : (
              <div className="p-4 h-full overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-600 sticky top-0 bg-gray-800">
                  <div className="font-semibold text-gray-300 text-sm">Member Name</div>
                  <div className="font-semibold text-gray-300 text-sm">Member #</div>
                </div>
                <div className="space-y-2">
                  {sortedRoster.map((member, idx) => {
                    const memberName = member.name || member.fullName || 'Unknown Member';
                    const memberNumber =
                      member.memberNumber || member.clubNumber || member.memberId || 'N/A';
                    return (
                      <div
                        key={member.memberId || member.memberNumber || idx}
                        className="flex justify-between items-center py-2 px-3 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        <span className="text-gray-200 font-medium">{memberName}</span>
                        <span className="text-gray-400 text-sm">{memberNumber}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'reserved': {
        // Reserved courts list
        const reservedItems = payload?.reservedData || [];
        const fmt = (d) =>
          new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return (
          <div className="modal-reserved-courts">
            {reservedItems.length === 0 ? (
              <div className="text-center p-6 pb-16">
                <p className="text-gray-400 reserved-courts-empty">No scheduled blocks today</p>
              </div>
            ) : (
              <ul className="space-y-0.5 reserved-courts-text text-gray-300 px-6 pb-16 pt-2">
                {reservedItems.map((item, idx) => (
                  <li key={item.key || idx} className="flex justify-between py-1">
                    <span className="font-medium text-gray-200">
                      {item.courts?.length > 1
                        ? `Courts ${item.courts.join(', ')}`
                        : `Court ${item.courts?.[0] || 'N/A'}`}
                    </span>
                    <span className="ml-2 whitespace-nowrap text-gray-400">
                      {fmt(item.start)} – {fmt(item.end)} ({item.reason || 'Reserved'})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case 'waitlist': {
        // Waitlist display - uses courts data from payload (passed from React state)
        const waitlistData = payload?.waitlistData || [];
        const modalCourts = payload?.courts || [];
        const modalCourtBlocks = payload?.courtBlocks || [];
        const modalUpcomingBlocks = payload?.upcomingBlocks || [];

        // Helper to convert courts array to data format for availability functions
        const courtsToDataModal = (courtsArray) => ({ courts: courtsArray || [] });

        // Mobile name formatting
        const formatMobileNamesModal = (nameArray) => {
          if (!nameArray || !nameArray.length) return 'Group';
          const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV']);
          const formatOne = (full) => {
            const tokens = full.replace(/\s+/g, ' ').trim().split(' ');
            if (tokens.length === 1) {
              // Single name (e.g., "Bob" or "Player") - return as-is, no formatting
              return tokens[0];
            }
            let last = tokens[tokens.length - 1];
            let last2 = tokens[tokens.length - 2];
            let lastName, remainder;
            if (SUFFIXES.has(last) && tokens.length > 2) {
              lastName = `${last2} ${last}`;
              remainder = tokens.slice(0, -2);
            } else {
              lastName = last;
              remainder = tokens.slice(0, -1);
            }
            const first = remainder[0] || '';
            return first ? `${first[0]}. ${lastName}` : lastName;
          };
          const primary = formatOne(nameArray[0]);
          return nameArray.length > 1 ? `${primary} +${nameArray.length - 1}` : primary;
        };

        // Calculate estimated wait time for mobile modal (uses payload data, not localStorage)
        const calculateMobileWaitTime = (position) => {
          try {
            const domain = getTennisDomain();
            const W = domain?.waitlist || domain?.Waitlist;

            if (!W?.simulateWaitlistEstimates) {
              return position * 15;
            }

            const now = new Date();
            // Combine active blocks and future blocks for accurate availability calculation
            const blocks = [...modalCourtBlocks, ...modalUpcomingBlocks];

            // Build a minimal waitlist up to current position for simulation
            const waitlistUpToPosition = (waitlistData || []).slice(0, position);

            const avgGame = getTennisNamespaceConfig()?.Timing?.AVG_GAME || 75;
            const etas = W.simulateWaitlistEstimates({
              courts: modalCourts || [],
              waitlist: waitlistUpToPosition,
              blocks,
              now,
              avgGameMinutes: avgGame,
            });
            // Get the last position's estimate (our position)
            return etas[position - 1] || 0;
          } catch (error) {
            console.warn('Error calculating mobile wait time:', error);
            return position * 15;
          }
        };

        // Check if first group can register now (uses payload data, not localStorage)
        const canFirstGroupRegister = () => {
          try {
            const domainCanFirst = getTennisDomain();
            const A = domainCanFirst?.availability || domainCanFirst?.Availability;
            if (!A) return false;

            const now = new Date();
            const data = courtsToDataModal(modalCourts); // Use payload data
            // Combine active blocks and future blocks for accurate availability calculation
            const blocks = [...modalCourtBlocks, ...modalUpcomingBlocks];
            const wetSet = new Set(
              blocks
                .filter(
                  (b) => b?.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
                )
                .map((b) => b.courtNumber)
            );

            if (A.getFreeCourtsInfo) {
              const info = A.getFreeCourtsInfo({ data, now, blocks, wetSet });
              const freeCount = info.free?.length || 0;
              const overtimeCount = info.overtime?.length || 0;
              return freeCount > 0 || overtimeCount > 0;
            }
            return false;
          } catch {
            return false;
          }
        };

        return (
          <div className="modal-waitlist">
            {waitlistData.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-gray-400">No groups waiting.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-600">
                  <div className="font-semibold text-gray-300 text-sm">Position</div>
                  <div className="font-semibold text-gray-300 text-sm">Estimated</div>
                </div>
                <div className="space-y-3">
                  {waitlistData.map((group, idx) => {
                    let names = [];
                    if (Array.isArray(group.players)) {
                      // Use displayName (domain format) first, then name (legacy), then id as fallback
                      names = group.players.map(
                        (p) => p.displayName || p.name || p.id || 'Unknown'
                      );
                    } else if (group.names) {
                      names = Array.isArray(group.names) ? group.names : [group.names];
                    } else if (group.name) {
                      names = [group.name];
                    } else {
                      names = ['Group'];
                    }

                    const formattedNames = formatMobileNamesModal(names);
                    const position = idx + 1;

                    // Calculate proper estimated wait time
                    let estimatedStr;
                    if (position === 1 && canFirstGroupRegister()) {
                      estimatedStr = 'Now';
                    } else {
                      const waitMinutes = calculateMobileWaitTime(position);
                      estimatedStr = waitMinutes > 0 ? `${waitMinutes}m` : 'Now';
                    }

                    return (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <div className="text-white">{`${idx + 1}. ${formattedNames}`}</div>
                        <div className="text-gray-400 text-sm">{estimatedStr}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'clear-court-confirm': {
        // Clear Court confirmation modal
        const clearCourtNumber = payload?.courtNumber || '';
        const clearCourtPlayers = payload?.players || '';
        return (
          <div className="p-6 text-center">
            {clearCourtPlayers && (
              <p className="text-gray-200 mb-4 text-lg">
                {clearCourtPlayers} on Court {clearCourtNumber}
              </p>
            )}
            <button
              type="button"
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
              onClick={async () => {
                try {
                  // Get court ID from current board state
                  const board = await backend.queries.getBoard();
                  const court = board?.courts?.find(
                    (c) => c && c.number === Number(clearCourtNumber)
                  );

                  if (court?.id) {
                    // Use API to end session
                    await backend.commands.endSession({
                      courtId: court.id,
                      reason: 'completed',
                    });
                    console.log(`[Courtboard] Court ${clearCourtNumber} cleared via API`);
                  } else {
                    console.warn(`[Courtboard] No court ID found for court ${clearCourtNumber}`);
                  }

                  // Post-clear cleanup (mobile UI state)
                  sessionStorage.removeItem('mobile-registered-court');
                  window.parent.postMessage({ type: 'resetRegistration' }, '*');
                  if (window.updateJoinButtonForMobile) {
                    window.updateJoinButtonForMobile();
                  }
                  onClose();
                } catch (e) {
                  console.error('Error clearing court:', e);
                  // Still close modal and update UI state on error
                  sessionStorage.removeItem('mobile-registered-court');
                  onClose();
                }
              }}
            >
              We have finished and are leaving Court {clearCourtNumber}
            </button>
          </div>
        );
      }

      case 'waitlist-available': {
        // Waitlist CTA - court is available for first waitlist group
        const firstGroup = payload?.firstGroup || {};
        const playerNames = (firstGroup.names || []).join(', ') || 'Next group';
        return (
          <div className="p-6 text-center">
            <p className="text-yellow-400 text-xl font-semibold mb-3">{playerNames}</p>
            <p className="text-gray-300 text-base">Tap an available court to play</p>
          </div>
        );
      }

      default:
        return (
          <div className="p-6 text-center">
            <p>Unknown modal type</p>
          </div>
        );
    }
  };

  const titleId = `modal-title-${type}`;

  const getModalClass = () => {
    if (type === 'court-conditions') return ' modal-court-conditions-full';
    if (type === 'roster') return ' modal-court-conditions-full';
    if (type === 'reserved') return ' modal-reserved-large';
    if (type === 'waitlist') return ' modal-waitlist-large';
    if (type === 'clear-court-confirm') return ' modal-clear-court-confirm';
    if (type === 'waitlist-available') return ' modal-waitlist-available';
    return '';
  };

  return (
    <div
      className={`mobile-modal-overlay${getModalClass()}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mobile-modal-content">
        <div className="mobile-modal-header">
          <h3 id={titleId} className="mobile-modal-title">
            {getTitle()}
          </h3>
          <button
            type="button"
            className="mobile-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="mobile-modal-body">{getBodyContent()}</div>
      </div>
    </div>
  );
}
