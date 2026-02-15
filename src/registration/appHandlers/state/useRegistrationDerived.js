import { useMemo } from 'react';

/**
 * useRegistrationDerived
 * Extracted from useRegistrationAppState — WP5.9.6.6b
 *
 * Owns computed/derived values (useMemo blocks).
 * Now uses courtSelection from data for canonical court availability.
 */
export function useRegistrationDerived({
  // Dependencies for waitlist CTA computation
  data,
  // Dependencies for member database
  CONSTANTS,
  // Passed through from parent
  isMobileView,
}) {
  // ===== DERIVED VALUES (useMemo) =====

  // CTA state derived from waitlist and courtSelection
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

    const courtSelection = data.courtSelection;

    const firstGroup = normalizedWaitlist[0] || null;
    const secondGroup = normalizedWaitlist[1] || null;

    const firstPlayerCount = firstGroup?.players?.length || 0;
    const firstIsDeferred = firstGroup?.deferred ?? false;
    const secondPlayerCount = secondGroup?.players?.length || 0;
    const secondIsDeferred = secondGroup?.deferred ?? false;

    let live1 = false;
    let live2 = false;

    if (courtSelection && firstGroup) {
      const firstAvailable = firstIsDeferred
        ? courtSelection.countFullTimeForGroup(firstPlayerCount)
        : courtSelection.countSelectableForGroup(firstPlayerCount);
      live1 = firstAvailable > 0;
    }

    if (courtSelection && secondGroup) {
      const secondAvailable = secondIsDeferred
        ? courtSelection.countFullTimeForGroup(secondPlayerCount)
        : courtSelection.countSelectableForGroup(secondPlayerCount);
      live2 = secondAvailable >= (live1 ? 2 : 1);
    }

    const first = firstGroup
      ? { id: firstGroup.id, position: firstGroup.position ?? 1, players: firstGroup.players }
      : null;
    const second = secondGroup
      ? { id: secondGroup.id, position: secondGroup.position ?? 2, players: secondGroup.players }
      : null;

    // Pass-through: if neither position 0 nor 1 can play,
    // find the first group from position 2+ that CAN play
    let passThrough = null;
    if (!live1 && !live2 && courtSelection && courtSelection.selectableCourts.length > 0) {
      for (let i = 2; i < normalizedWaitlist.length; i++) {
        const entry = normalizedWaitlist[i];
        const playerCount = entry?.players?.length || 0;
        const isDeferred = entry.deferred ?? false;
        const eligible = isDeferred
          ? courtSelection.countFullTimeForGroup(playerCount)
          : courtSelection.countSelectableForGroup(playerCount);
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
  }, [data.waitlist, data.courtSelection]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: initialize debug helper once
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
