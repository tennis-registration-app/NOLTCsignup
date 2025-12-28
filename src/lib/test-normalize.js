/**
 * Quick verification that normalize + validate works
 * Run with: node src/lib/test-normalize.js
 */

import { normalizeBoard } from './normalize/index.js';
import { validateBoard } from './schemas/domain.js';

// REALISTIC API response from get_court_board RPC (FLATTENED format)
// This is what the actual API returns - session/block fields are flat on the court object
const mockApiResponse = {
  ok: true,
  serverNow: '2025-12-27T23:00:00.000Z',
  courts: [
    {
      // Court 1: occupied with a session (FLATTENED format from get_court_board)
      court_id: 'court-uuid-1',
      court_number: 1,
      status: 'occupied',
      session_id: 'session-uuid-1',
      started_at: '2025-12-27T22:00:00.000Z',
      scheduled_end_at: '2025-12-27T23:00:00.000Z',
      session_type: 'doubles',
      minutes_remaining: 0,
      participants: [
        { member_id: 'member-1', display_name: 'Anna Sinner', participant_type: 'host' },
        { member_id: 'member-2', display_name: 'Iga Swiatek', participant_type: 'guest' },
      ],
      block_id: null,
      block_title: null,
      block_ends_at: null,
    },
    {
      // Court 2: blocked (FLATTENED format)
      court_id: 'court-uuid-2',
      court_number: 2,
      status: 'blocked',
      session_id: null,
      started_at: null,
      scheduled_end_at: null,
      session_type: null,
      minutes_remaining: null,
      participants: [],
      block_id: 'block-uuid-1',
      block_title: 'Maintenance',
      block_ends_at: '2025-12-27T23:30:00.000Z',
    },
    {
      // Court 3: available (FLATTENED format)
      court_id: 'court-uuid-3',
      court_number: 3,
      status: 'available',
      session_id: null,
      started_at: null,
      scheduled_end_at: null,
      session_type: null,
      minutes_remaining: null,
      participants: [],
      block_id: null,
      block_title: null,
      block_ends_at: null,
    },
  ],
  // REALISTIC waitlist from get_active_waitlist RPC
  waitlist: [
    {
      id: 'waitlist-uuid-1',
      position: 1,
      group_type: 'doubles',
      joined_at: '2025-12-27T22:30:00.000Z',
      minutes_waiting: 30,
      participants: [
        { member_id: 'member-3', display_name: 'Borna Coric', participant_type: 'host' },
        { member_id: 'member-4', display_name: 'Holger Rune', participant_type: 'partner' },
      ],
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
console.log('Court 1 session exists:', board.courts[0]?.session !== null);
console.log('Court 1 players count:', board.courts[0]?.session?.group?.players?.length);
console.log('Court 1 player 1:', board.courts[0]?.session?.group?.players[0]?.displayName);
console.log('Court 1 player 2:', board.courts[0]?.session?.group?.players[1]?.displayName);
console.log('Court 2 blocked:', board.courts[1]?.isBlocked);
console.log('Court 2 block reason:', board.courts[1]?.block?.reason);
console.log('Court 3 available:', board.courts[2]?.isAvailable);
console.log('Waitlist entries:', board.waitlist.length);
console.log('First in waitlist:', board.waitlist[0]?.group?.players[0]?.displayName);
console.log('Waitlist group type:', board.waitlist[0]?.group?.type);
