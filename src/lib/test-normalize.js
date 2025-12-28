/**
 * Quick verification that normalize + validate works
 * Run with: node src/lib/test-normalize.js
 */

import { normalizeBoard } from './normalize/index.js';
import { validateBoard } from './schemas/domain.js';

// Sample raw API response (mimics /get-board)
const mockApiResponse = {
  ok: true,
  serverNow: '2025-12-27T23:00:00.000Z',
  courts: [
    {
      number: 1,
      isOccupied: true,
      isBlocked: false,
      session: {
        id: 'session-1',
        started_at: '2025-12-27T22:00:00.000Z',
        scheduled_end_at: '2025-12-27T23:00:00.000Z',
        players: [{ member_id: 'member-1', display_name: 'Anna Sinner', is_guest: false }],
      },
    },
    {
      number: 2,
      isOccupied: false,
      isBlocked: true,
      block: {
        id: 'block-1',
        starts_at: '2025-12-27T22:00:00.000Z',
        ends_at: '2025-12-27T23:30:00.000Z',
        reason: 'Maintenance',
      },
    },
  ],
  waitlist: [
    {
      id: 'waitlist-1',
      position: 1,
      joined_at: '2025-12-27T22:30:00.000Z',
      participants: [{ memberId: 'member-2', displayName: 'Borna Coric', isGuest: false }],
    },
  ],
};

console.log('=== Testing normalizeBoard ===');
const board = normalizeBoard(mockApiResponse);
console.log('Normalized board:', JSON.stringify(board, null, 2));

console.log('\n=== Testing validateBoard ===');
const validation = validateBoard(board);
console.log('Validation success:', validation.success);
if (!validation.success) {
  console.log('Errors:', validation.error.format());
}

console.log('\n=== Summary ===');
console.log('Courts:', board.courts.length);
console.log('Court 1 occupied:', board.courts[0]?.isOccupied);
console.log('Court 1 player:', board.courts[0]?.session?.group?.players[0]?.displayName);
console.log('Court 2 blocked:', board.courts[1]?.isBlocked);
console.log('Waitlist entries:', board.waitlist.length);
console.log('First in waitlist:', board.waitlist[0]?.group?.players[0]?.displayName);
