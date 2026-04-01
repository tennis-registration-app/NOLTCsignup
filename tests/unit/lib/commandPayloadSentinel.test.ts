/**
 * Command Payload Contract Sentinel
 *
 * Freezes the wire format (snake_case keys) of every payload sent to
 * Edge Functions. If a wire mapper adds, removes, or renames a key,
 * this test breaks before E2E.
 *
 * Strategy:
 * - Call each exported toXxxPayload mapper with representative inputs
 * - Assert exact key sets (sorted, order-independent)
 * - Assert values map correctly from camelCase inputs
 *
 * For inline payloads (restoreSession, undoOvertimeTakeover,
 * updateSessionTournament, generateLocationToken) there is no
 * exported mapper — those are trivial object literals tested via
 * E2E. This file covers the 11 exported mappers only.
 */

import { describe, it, expect } from 'vitest';

// wire.js mappers (used by TennisCommands for most commands)
import {
  toAssignCourtPayload,
  toEndSessionPayload,
  toJoinWaitlistPayload,
  toCancelWaitlistPayload,
  toDeferWaitlistPayload,
  toAssignFromWaitlistPayload,
  toCreateBlockPayload,
  toCancelBlockPayload,
} from '../../../src/lib/backend/wire.js';

// commands/ mappers (used by TennisCommands for moveCourt, clearWaitlist, purchaseBalls)
import {
  toMoveCourtPayload,
  toClearWaitlistPayload,
  toPurchaseBallsPayload,
} from '../../../src/lib/commands/index.js';

// ============================================================
// Helpers
// ============================================================
const sorted = (obj: any) => Object.keys(obj).sort();

// ============================================================
// wire.js — toAssignCourtPayload
// ============================================================
describe('toAssignCourtPayload', () => {
  const MEMBER_PARTICIPANT = { kind: 'member' as const, memberId: 'M100', accountId: 'A100' };
  const GUEST_PARTICIPANT = {
    kind: 'guest' as const,
    guestName: 'Jane Doe',
    accountId: 'A200',
    chargedToAccountId: 'A100',
  };

  it('has frozen key set (base — no geo)', () => {
    const payload = toAssignCourtPayload({
      courtId: 'uuid-1',
      groupType: 'doubles',
      participants: [MEMBER_PARTICIPANT],
      addBalls: false,
      splitBalls: false,
    });
    expect(sorted(payload)).toEqual([
      'add_balls',
      'court_id',
      'participants',
      'session_type',
      'split_balls',
    ]);
  });

  it('maps member participant correctly', () => {
    const payload = toAssignCourtPayload({
      courtId: 'uuid-1',
      groupType: 'singles',
      participants: [MEMBER_PARTICIPANT],
    });
    expect(payload.court_id).toBe('uuid-1');
    expect(payload.session_type).toBe('singles');
    expect(payload.participants[0]).toEqual({
      type: 'member',
      member_id: 'M100',
      account_id: 'A100',
    });
  });

  it('maps guest participant correctly', () => {
    const payload = toAssignCourtPayload({
      courtId: 'uuid-1',
      groupType: 'doubles',
      participants: [GUEST_PARTICIPANT],
    });
    expect(payload.participants[0]).toEqual({
      type: 'guest',
      guest_name: 'Jane Doe',
      account_id: 'A200',
      charged_to_account_id: 'A100',
    });
  });

  it('includes geolocation keys when provided', () => {
    const payload = toAssignCourtPayload({
      courtId: 'uuid-1',
      groupType: 'singles',
      participants: [MEMBER_PARTICIPANT],
      latitude: 29.95,
      longitude: -90.07,
      accuracy: 12.5,
    });
    expect(sorted(payload)).toEqual([
      'accuracy',
      'add_balls',
      'court_id',
      'latitude',
      'longitude',
      'participants',
      'session_type',
      'split_balls',
    ]);
    expect(payload.latitude).toBe(29.95);
    expect(payload.longitude).toBe(-90.07);
    expect(payload.accuracy).toBe(12.5);
  });

  it('includes location_token when provided', () => {
    const payload = toAssignCourtPayload({
      courtId: 'uuid-1',
      groupType: 'singles',
      participants: [MEMBER_PARTICIPANT],
      location_token: 'tok-abc',
    });
    expect(payload.location_token).toBe('tok-abc');
  });
});

// ============================================================
// wire.js — toEndSessionPayload
// ============================================================
describe('toEndSessionPayload', () => {
  it('has frozen key set', () => {
    const payload = toEndSessionPayload({ courtId: 'uuid-1', reason: 'cleared' });
    expect(sorted(payload)).toEqual(['court_id', 'end_reason']);
  });

  it('maps values correctly', () => {
    const payload = toEndSessionPayload({ courtId: 'uuid-1', reason: 'cleared' });
    expect(payload.court_id).toBe('uuid-1');
    expect(payload.end_reason).toBe('cleared');
  });

  it('maps observed reason to observed_cleared', () => {
    const payload = toEndSessionPayload({ courtId: 'uuid-1', reason: 'observed empty' });
    expect(payload.end_reason).toBe('observed_cleared');
  });

  it('defaults end_reason to cleared when reason is falsy', () => {
    const payload = toEndSessionPayload({ courtId: 'uuid-1' });
    expect(payload.end_reason).toBe('cleared');
  });
});

// ============================================================
// wire.js — toJoinWaitlistPayload
// ============================================================
describe('toJoinWaitlistPayload', () => {
  const MEMBER = { kind: 'member' as const, memberId: 'M200', accountId: 'A200' };

  it('has frozen key set (base — no geo, no deferred)', () => {
    const payload = toJoinWaitlistPayload({
      groupType: 'doubles',
      participants: [MEMBER],
    });
    expect(sorted(payload)).toEqual(['group_type', 'participants']);
  });

  it('maps participant correctly', () => {
    const payload = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [MEMBER],
    });
    expect(payload.group_type).toBe('singles');
    expect(payload.participants[0]).toEqual({
      type: 'member',
      member_id: 'M200',
      account_id: 'A200',
    });
  });

  it('includes geolocation keys when provided', () => {
    const payload = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [MEMBER],
      latitude: 29.95,
      longitude: -90.07,
    });
    expect(sorted(payload)).toEqual([
      'group_type',
      'latitude',
      'longitude',
      'participants',
    ]);
  });

  it('includes deferred flag when true', () => {
    const payload = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [MEMBER],
      deferred: true,
    });
    expect(payload.deferred).toBe(true);
  });

  it('includes location_token when provided', () => {
    const payload = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [MEMBER],
      location_token: 'tok-xyz',
    });
    expect(payload.location_token).toBe('tok-xyz');
  });
});

// ============================================================
// wire.js — toCancelWaitlistPayload
// ============================================================
describe('toCancelWaitlistPayload (wire.js)', () => {
  it('has frozen key set', () => {
    const payload = toCancelWaitlistPayload({ entryId: 'wl-uuid-1' });
    expect(sorted(payload)).toEqual(['waitlist_id']);
  });

  it('maps values correctly', () => {
    const payload = toCancelWaitlistPayload({ entryId: 'wl-uuid-1' });
    expect(payload.waitlist_id).toBe('wl-uuid-1');
  });
});

// ============================================================
// wire.js — toDeferWaitlistPayload
// ============================================================
describe('toDeferWaitlistPayload (wire.js)', () => {
  it('has frozen key set', () => {
    const payload = toDeferWaitlistPayload({ entryId: 'wl-uuid-2', deferred: true });
    expect(sorted(payload)).toEqual(['deferred', 'waitlist_id']);
  });

  it('maps values correctly', () => {
    const payload = toDeferWaitlistPayload({ entryId: 'wl-uuid-2', deferred: false });
    expect(payload.waitlist_id).toBe('wl-uuid-2');
    expect(payload.deferred).toBe(false);
  });
});

// ============================================================
// wire.js — toAssignFromWaitlistPayload
// ============================================================
describe('toAssignFromWaitlistPayload', () => {
  it('has frozen key set (base — no geo)', () => {
    const payload = toAssignFromWaitlistPayload({
      waitlistEntryId: 'wl-uuid-3',
      courtId: 'uuid-court-5',
    });
    expect(sorted(payload)).toEqual(['court_id', 'waitlist_id']);
  });

  it('maps values correctly', () => {
    const payload = toAssignFromWaitlistPayload({
      waitlistEntryId: 'wl-uuid-3',
      courtId: 'uuid-court-5',
    });
    expect(payload.waitlist_id).toBe('wl-uuid-3');
    expect(payload.court_id).toBe('uuid-court-5');
  });

  it('includes geolocation keys when provided', () => {
    const payload = toAssignFromWaitlistPayload({
      waitlistEntryId: 'wl-uuid-3',
      courtId: 'uuid-court-5',
      latitude: 29.95,
      longitude: -90.07,
      accuracy: 8.0,
    });
    expect(sorted(payload)).toEqual([
      'accuracy',
      'court_id',
      'latitude',
      'longitude',
      'waitlist_id',
    ]);
  });

  it('includes location_token when provided', () => {
    const payload = toAssignFromWaitlistPayload({
      waitlistEntryId: 'wl-uuid-3',
      courtId: 'uuid-court-5',
      location_token: 'tok-qr',
    });
    expect(payload.location_token).toBe('tok-qr');
  });
});

// ============================================================
// wire.js — toCreateBlockPayload
// ============================================================
describe('toCreateBlockPayload', () => {
  it('has frozen key set', () => {
    const payload = toCreateBlockPayload({
      courtId: 'uuid-court-3',
      blockType: 'maintenance',
      reason: 'Resurfacing',
      startTime: '2025-06-15T08:00:00Z',
      endTime: '2025-06-15T10:00:00Z',
    });
    expect(sorted(payload)).toEqual([
      'block_type',
      'court_id',
      'ends_at',
      'starts_at',
      'title',
    ]);
  });

  it('maps values correctly', () => {
    const payload = toCreateBlockPayload({
      courtId: 'uuid-court-3',
      blockType: 'event',
      reason: 'Tournament',
      startTime: '2025-06-15T08:00:00Z',
      endTime: '2025-06-15T10:00:00Z',
    });
    expect(payload.court_id).toBe('uuid-court-3');
    expect(payload.block_type).toBe('event');
    expect(payload.title).toBe('Tournament');
    expect(payload.starts_at).toBe('2025-06-15T08:00:00Z');
    expect(payload.ends_at).toBe('2025-06-15T10:00:00Z');
  });
});

// ============================================================
// wire.js — toCancelBlockPayload
// ============================================================
describe('toCancelBlockPayload', () => {
  it('has frozen key set', () => {
    const payload = toCancelBlockPayload({ blockId: 'blk-uuid-1' });
    expect(sorted(payload)).toEqual(['block_id']);
  });

  it('maps values correctly', () => {
    const payload = toCancelBlockPayload({ blockId: 'blk-uuid-1' });
    expect(payload.block_id).toBe('blk-uuid-1');
  });
});

// ============================================================
// commands/ — toMoveCourtPayload
// ============================================================
describe('toMoveCourtPayload (commands)', () => {
  it('has frozen key set', () => {
    const payload = toMoveCourtPayload({
      fromCourtId: 'uuid-from',
      toCourtId: 'uuid-to',
    });
    expect(sorted(payload)).toEqual(['from_court_id', 'to_court_id']);
  });

  it('maps values correctly', () => {
    const payload = toMoveCourtPayload({
      fromCourtId: 'uuid-from',
      toCourtId: 'uuid-to',
    });
    expect(payload.from_court_id).toBe('uuid-from');
    expect(payload.to_court_id).toBe('uuid-to');
  });
});

// ============================================================
// commands/ — toClearWaitlistPayload
// ============================================================
describe('toClearWaitlistPayload (commands)', () => {
  it('has frozen key set (empty payload)', () => {
    const payload = toClearWaitlistPayload({});
    expect(sorted(payload)).toEqual([]);
    expect(payload).toEqual({});
  });
});

// ============================================================
// commands/ — toPurchaseBallsPayload
// ============================================================
describe('toPurchaseBallsPayload (commands)', () => {
  it('has frozen key set', () => {
    const payload = toPurchaseBallsPayload({
      sessionId: 'sess-uuid-1',
      accountId: 'acct-uuid-1',
      splitBalls: false,
      splitAccountIds: null,
      idempotencyKey: 'pb-sess-uuid-1-1234',
    });
    expect(sorted(payload)).toEqual([
      'account_id',
      'idempotency_key',
      'session_id',
      'split_account_ids',
      'split_balls',
    ]);
  });

  it('maps values correctly', () => {
    const payload = toPurchaseBallsPayload({
      sessionId: 'sess-uuid-1',
      accountId: 'acct-uuid-1',
      splitBalls: true,
      splitAccountIds: ['acct-uuid-2', 'acct-uuid-3'],
      idempotencyKey: 'pb-key-1',
    });
    expect(payload.session_id).toBe('sess-uuid-1');
    expect(payload.account_id).toBe('acct-uuid-1');
    expect(payload.split_balls).toBe(true);
    expect(payload.split_account_ids).toEqual(['acct-uuid-2', 'acct-uuid-3']);
    expect(payload.idempotency_key).toBe('pb-key-1');
  });
});
