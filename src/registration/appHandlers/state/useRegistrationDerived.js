import { useMemo } from 'react';
import { isCourtEligibleForGroup } from '../../../lib/types/domain.js';
import { getUpcomingBlockWarningFromBlocks } from '@lib';

/**
 * useRegistrationDerived
 * Extracted from useRegistrationAppState — WP5.9.6.6b
 *
 * Owns computed/derived values (useMemo blocks).
 * Verbatim extraction — no logic changes.
 */
export function useRegistrationDerived({
  // Dependencies for waitlist CTA computation
  data,
  availableCourts,
  // Dependencies for member database
  CONSTANTS,
  // Passed through from parent
  isMobileView,
}) {
  // ===== DERIVED VALUES (useMemo) =====

  // CTA state derived from waitlist and available courts
  const {
    firstWaitlistEntry,
    secondWaitlistEntry,
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    canPassThroughGroupPlay,
    passThroughEntry,
    passThroughEntryData,
  } = useMemo(() => {
    const normalizedWaitlist = (data.waitlist || []).map((entry) => ({
      id: entry.id,
      position: entry.position,
      groupType: entry.group?.type,
      joinedAt: entry.joinedAt,
      minutesWaiting: entry.minutesWaiting,
      names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
      players: entry.group?.players || [],
      deferred: entry.deferred ?? false,
    }));

    const upcomingBlocks = data.upcomingBlocks || [];

    // Check if any eligible court offers full session time for a given player count
    const hasFullTimeCourt = (playerCount) => {
      const sessionDuration = playerCount >= 4 ? 90 : 60;
      const eligible = availableCourts.filter((courtNum) =>
        isCourtEligibleForGroup(courtNum, playerCount)
      );
      return eligible.some((courtNum) => {
        const warning = getUpcomingBlockWarningFromBlocks(
          courtNum,
          sessionDuration + 5,
          upcomingBlocks
        );
        return warning == null; // null = no restriction = full time
      });
    };

    const firstGroup = normalizedWaitlist[0] || null;
    const secondGroup = normalizedWaitlist[1] || null;

    // Filter available courts by singles-only eligibility for each group
    const firstGroupPlayerCount = firstGroup?.players?.length || 0;
    const secondGroupPlayerCount = secondGroup?.players?.length || 0;
    const eligibleForFirst = availableCourts.filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, firstGroupPlayerCount)
    ).length;
    const eligibleForSecond = availableCourts.filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, secondGroupPlayerCount)
    ).length;

    // Deferred groups: skip only when no full-time court available
    const firstDeferred = firstGroup?.deferred && !hasFullTimeCourt(firstGroupPlayerCount);
    const secondDeferred = secondGroup?.deferred && !hasFullTimeCourt(secondGroupPlayerCount);

    const live1 = eligibleForFirst >= 1 && firstGroup !== null && !firstDeferred;
    const courtsNeededForSecond = live1 ? 2 : 1;
    const live2 =
      eligibleForSecond >= courtsNeededForSecond && secondGroup !== null && !secondDeferred;

    const first = firstGroup
      ? { id: firstGroup.id, position: firstGroup.position ?? 1, players: firstGroup.players }
      : null;
    const second = secondGroup
      ? { id: secondGroup.id, position: secondGroup.position ?? 2, players: secondGroup.players }
      : null;

    // Pass-through: if neither position 0 nor 1 can play,
    // find the first group from position 2+ that CAN play
    let passThrough = null;
    if (!live1 && !live2 && availableCourts.length > 0) {
      for (let i = 2; i < normalizedWaitlist.length; i++) {
        const entry = normalizedWaitlist[i];
        // Deferred groups: skip only when no full-time court available
        const playerCount = entry?.players?.length || 0;
        if (entry.deferred && !hasFullTimeCourt(playerCount)) continue;
        const eligible = availableCourts.filter((courtNum) =>
          isCourtEligibleForGroup(courtNum, playerCount)
        ).length;
        if (eligible >= 1) {
          passThrough = {
            id: entry.id,
            position: entry.position ?? i + 1,
            players: entry.players,
          };
          break;
        }
      }
    }

    return {
      firstWaitlistEntry: first,
      secondWaitlistEntry: second,
      canFirstGroupPlay: !!live1,
      canSecondGroupPlay: !!live2,
      firstWaitlistEntryData: first,
      secondWaitlistEntryData: second,
      canPassThroughGroupPlay: passThrough !== null,
      passThroughEntry: passThrough,
      passThroughEntryData: passThrough,
    };
  }, [data.waitlist, data.upcomingBlocks, availableCourts]);

  // Member database (simplified for autocomplete)
  const memberDatabase = useMemo(() => {
    const db = {};
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
      'Stefanos Tsitsipas',
      'Felix Auger-Aliassime',
      'Cameron Norrie',
      'Karen Khachanov',
      'Frances Tiafoe',
      'Tommy Paul',
      'Lorenzo Musetti',
      'Ben Shelton',
      'Nicolas Jarry',
      'Sebastian Korda',
      'Madison Keys',
      'Victoria Azarenka',
      'Daria Kasatkina',
      'Belinda Bencic',
      'Caroline Garcia',
      'Simona Halep',
      'Elina Svitolina',
      'Maria Sakkari',
      'Liudmila Samsonova',
      'Zheng Qinwen',
    ];

    for (let i = 1; i <= CONSTANTS.MEMBER_COUNT; i++) {
      const id = CONSTANTS.MEMBER_ID_START + i;
      db[id.toString()] = {
        familyMembers: [
          {
            id: id,
            name: names[i - 1] || `Player ${i}`,
            phone: `555-${String(i).padStart(4, '0')}`,
            ranking: ((i - 1) % 20) + 1,
            winRate: 0.5 + Math.random() * 0.4,
          },
        ],
        playingHistory: [],
        lastGame: null,
      };
    }
    return db;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isMobileView,
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntry,
    secondWaitlistEntry,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    canPassThroughGroupPlay,
    passThroughEntry,
    passThroughEntryData,
    memberDatabase,
  };
}
