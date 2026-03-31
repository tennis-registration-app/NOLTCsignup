import { formatTimeRemaining as formatTimeRemainingCore } from '../../lib/formatters';

interface CourtObject {
  block?: { id?: string; reason?: string };
  players?: CourtPlayer[];
  endTime?: string;
  startTime?: string;
  duration?: number;
  sessionId?: string;
  id?: string;
  session?: {
    id?: string;
    group?: { players?: CourtPlayer[] };
    scheduledEndAt?: string;
    startedAt?: string;
    duration?: number;
  };
  number?: number;
  [key: string]: unknown;
}

export interface CourtBlock {
  courtNumber?: number;
  isWetCourt?: boolean;
  reason?: string;
  startTime?: string;
  endTime?: string;
  id?: string;
  [key: string]: unknown;
}

export interface CourtPlayer {
  displayName?: string;
  name?: string;
  playerName?: string;
  [key: string]: unknown;
}

export interface CourtStatusInfo {
  id?: string;
  reason?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  courtNumber?: number;
  sessionId?: string;
  players?: CourtPlayer[];
  duration?: number;
}

export interface CourtStatusResult {
  status: string;
  info: CourtStatusInfo | null;
}

interface GetCourtStatusDeps {
  wetCourts?: Set<number>;
  courtBlocks: CourtBlock[];
  selectedDate?: Date;
  currentTime?: Date;
}

export function getCourtStatus(
  court: CourtObject | null,
  courtNumber: number,
  { wetCourts, courtBlocks, selectedDate = new Date(), currentTime = new Date() }: GetCourtStatusDeps
): CourtStatusResult {
  if (wetCourts?.has(courtNumber)) {
    return {
      status: 'wet',
      info: {
        id: court?.block?.id,
        reason: court?.block?.reason || 'WET COURT',
        type: 'wet',
      },
    };
  }

  const activeBlock = courtBlocks.find((block) => {
    if (block.courtNumber !== courtNumber) return false;
    if (block.isWetCourt) return false;
    if ((block.reason || '').toLowerCase().includes('wet')) return false;
    const blockStart = new Date(block.startTime!);
    const blockEnd = new Date(block.endTime!);

    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    const blockOverlapsSelectedDate = blockStart < selectedDateEnd && blockEnd > selectedDateStart;
    if (!blockOverlapsSelectedDate) return false;

    if (selectedDate.toDateString() === new Date().toDateString()) {
      return currentTime >= blockStart && currentTime < blockEnd;
    } else {
      return true;
    }
  });

  if (activeBlock) {
    return {
      status: 'blocked',
      info: {
        id: activeBlock.id,
        reason: activeBlock.reason,
        startTime: activeBlock.startTime,
        endTime: activeBlock.endTime,
        type: 'block',
        courtNumber: courtNumber,
      },
    };
  }

  if (court && court.players && court.players.length > 0) {
    const endTime = new Date(court.endTime!);
    const isOvertime = currentTime > endTime;

    return {
      status: isOvertime ? 'overtime' : 'occupied',
      info: {
        sessionId: court.sessionId || court.id,
        players: court.players,
        startTime: court.startTime,
        endTime: court.endTime,
        duration: court.duration,
        type: 'game',
        courtNumber: courtNumber,
      },
    };
  }

  const sessionPlayers = court?.session?.group?.players;
  if (sessionPlayers && sessionPlayers.length > 0) {
    const endTime = new Date(court!.session!.scheduledEndAt!);
    const isOvertime = currentTime > endTime;

    return {
      status: isOvertime ? 'overtime' : 'occupied',
      info: {
        sessionId: court!.session!.id,
        players: sessionPlayers,
        startTime: court!.session!.startedAt,
        endTime: court!.session!.scheduledEndAt,
        duration: court!.session!.duration,
        type: 'game',
        courtNumber: courtNumber,
      },
    };
  }

  return { status: 'available', info: null };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-green-100 border-green-300';
    case 'occupied':
      return 'bg-blue-100 border-blue-300';
    case 'overtime':
      return 'bg-gray-100 border-gray-300';
    case 'blocked':
      return 'bg-amber-50 border-amber-300';
    case 'wet':
      return 'bg-gray-200 border-gray-400';
    default:
      return 'bg-gray-100 border-gray-300';
  }
}

export function formatTimeRemaining(endTime: string | Date, currentTime: Date): string {
  return formatTimeRemainingCore(endTime, currentTime || new Date(), {
    appendLeftSuffix: true,
    showOvertimeRemainder: true,
  });
}

export function getPlayerNames(players: CourtPlayer[]): string {
  if (!players || players.length === 0) return 'No players';
  return players
    .map((p) => {
      const name = p.displayName || p.name || p.playerName || 'Unknown';
      return name.split(' ').pop();
    })
    .join(' & ');
}
