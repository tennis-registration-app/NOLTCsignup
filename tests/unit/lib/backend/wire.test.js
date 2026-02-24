/**
 * wire.js — wire format mapper tests
 *
 * Tests all exported payload mappers and the internal mapEndReason function.
 */

import { describe, it, expect } from 'vitest';
import {
  toAssignCourtPayload,
  toEndSessionPayload,
  toJoinWaitlistPayload,
  toCancelWaitlistPayload,
  toAssignFromWaitlistPayload,
  toCreateBlockPayload,
  toCancelBlockPayload,
  toPurchaseBallsPayload,
  toDeferWaitlistPayload,
} from '../../../../src/lib/backend/wire.js';

// ── toAssignCourtPayload ─────────────────────────────────────
describe('toAssignCourtPayload', () => {
  it('maps member participants', () => {
    const result = toAssignCourtPayload({
      courtId: 'court-uuid',
      groupType: 'doubles',
      participants: [
        { kind: 'member', memberId: 'm1', accountId: 'a1' },
      ],
      addBalls: true,
      splitBalls: false,
    });
    expect(result.court_id).toBe('court-uuid');
    expect(result.session_type).toBe('doubles');
    expect(result.participants[0].type).toBe('member');
    expect(result.participants[0].member_id).toBe('m1');
    expect(result.add_balls).toBe(true);
  });

  it('maps guest participants', () => {
    const result = toAssignCourtPayload({
      courtId: 'c1',
      groupType: 'singles',
      participants: [
        { kind: 'guest', guestName: 'Guest 1', accountId: 'a1', chargedToAccountId: 'a2' },
      ],
    });
    expect(result.participants[0].type).toBe('guest');
    expect(result.participants[0].guest_name).toBe('Guest 1');
    expect(result.participants[0].charged_to_account_id).toBe('a2');
  });

  it('uses accountId as fallback for chargedToAccountId', () => {
    const result = toAssignCourtPayload({
      courtId: 'c1',
      groupType: 'singles',
      participants: [{ kind: 'guest', guestName: 'G', accountId: 'a1' }],
    });
    expect(result.participants[0].charged_to_account_id).toBe('a1');
  });

  it('includes geolocation when provided', () => {
    const result = toAssignCourtPayload({
      courtId: 'c1',
      groupType: 'singles',
      participants: [],
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
    });
    expect(result.latitude).toBe(37.7749);
    expect(result.longitude).toBe(-122.4194);
    expect(result.accuracy).toBe(10);
  });

  it('excludes geolocation when not provided', () => {
    const result = toAssignCourtPayload({
      courtId: 'c1',
      groupType: 'singles',
      participants: [],
    });
    expect(result.latitude).toBeUndefined();
    expect(result.longitude).toBeUndefined();
  });

  it('includes location_token when provided', () => {
    const result = toAssignCourtPayload({
      courtId: 'c1',
      groupType: 'singles',
      participants: [],
      location_token: 'tok-123',
    });
    expect(result.location_token).toBe('tok-123');
  });
});

// ── toEndSessionPayload ──────────────────────────────────────
describe('toEndSessionPayload', () => {
  it('maps basic end session', () => {
    const result = toEndSessionPayload({ courtId: 'c1', reason: 'cleared' });
    expect(result.court_id).toBe('c1');
    expect(result.end_reason).toBe('cleared');
  });

  it('defaults to cleared when no reason', () => {
    const result = toEndSessionPayload({ courtId: 'c1' });
    expect(result.end_reason).toBe('cleared');
  });

  // mapEndReason branch coverage (accessed via toEndSessionPayload)
  it('passes through valid API reasons', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'observed_cleared' }).end_reason).toBe('observed_cleared');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'admin_override' }).end_reason).toBe('admin_override');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'overtime_takeover' }).end_reason).toBe('overtime_takeover');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'auto_cleared' }).end_reason).toBe('auto_cleared');
  });

  it('maps player self-clear keywords', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'early departure' }).end_reason).toBe('cleared');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'we left' }).end_reason).toBe('cleared');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'done playing' }).end_reason).toBe('cleared');
  });

  it('maps observed/empty keywords', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'observed empty' }).end_reason).toBe('observed_cleared');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'court is empty' }).end_reason).toBe('observed_cleared');
  });

  it('maps admin keywords', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'admin clear' }).end_reason).toBe('admin_override');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'force end' }).end_reason).toBe('admin_override');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'override session' }).end_reason).toBe('admin_override');
  });

  it('maps overtime/bump keywords', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'bumped' }).end_reason).toBe('overtime_takeover');
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'overtime takeover' }).end_reason).toBe('overtime_takeover');
  });

  it('defaults unknown reasons to cleared', () => {
    expect(toEndSessionPayload({ courtId: 'c1', reason: 'unknown reason' }).end_reason).toBe('cleared');
  });

  it('uses endReason as fallback', () => {
    const result = toEndSessionPayload({ courtId: 'c1', endReason: 'admin_override' });
    expect(result.end_reason).toBe('admin_override');
  });
});

// ── toJoinWaitlistPayload ────────────────────────────────────
describe('toJoinWaitlistPayload', () => {
  it('maps basic join waitlist', () => {
    const result = toJoinWaitlistPayload({
      groupType: 'doubles',
      participants: [{ kind: 'member', memberId: 'm1', accountId: 'a1' }],
    });
    expect(result.group_type).toBe('doubles');
    expect(result.participants[0].type).toBe('member');
  });

  it('maps guest participants', () => {
    const result = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [{ kind: 'guest', guestName: 'Guest', accountId: 'a1' }],
    });
    expect(result.participants[0].type).toBe('guest');
    expect(result.participants[0].guest_name).toBe('Guest');
  });

  it('includes deferred flag', () => {
    const result = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [],
      deferred: true,
    });
    expect(result.deferred).toBe(true);
  });

  it('includes geolocation', () => {
    const result = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [],
      latitude: 1,
      longitude: 2,
    });
    expect(result.latitude).toBe(1);
    expect(result.longitude).toBe(2);
  });

  it('includes location_token', () => {
    const result = toJoinWaitlistPayload({
      groupType: 'singles',
      participants: [],
      location_token: 'tok',
    });
    expect(result.location_token).toBe('tok');
  });
});

// ── toCancelWaitlistPayload ──────────────────────────────────
describe('toCancelWaitlistPayload', () => {
  it('maps entryId to waitlist_id', () => {
    expect(toCancelWaitlistPayload({ entryId: 'e1' }).waitlist_id).toBe('e1');
  });
});

// ── toAssignFromWaitlistPayload ──────────────────────────────
describe('toAssignFromWaitlistPayload', () => {
  it('maps basic payload', () => {
    const result = toAssignFromWaitlistPayload({
      waitlistEntryId: 'w1',
      courtId: 'c1',
    });
    expect(result.waitlist_id).toBe('w1');
    expect(result.court_id).toBe('c1');
  });

  it('includes geolocation', () => {
    const result = toAssignFromWaitlistPayload({
      waitlistEntryId: 'w1',
      courtId: 'c1',
      latitude: 1,
      longitude: 2,
      accuracy: 5,
    });
    expect(result.latitude).toBe(1);
    expect(result.accuracy).toBe(5);
  });

  it('includes location_token', () => {
    const result = toAssignFromWaitlistPayload({
      waitlistEntryId: 'w1',
      courtId: 'c1',
      location_token: 'tok',
    });
    expect(result.location_token).toBe('tok');
  });
});

// ── toCreateBlockPayload ─────────────────────────────────────
describe('toCreateBlockPayload', () => {
  it('maps block creation payload', () => {
    const result = toCreateBlockPayload({
      courtId: 'c1',
      reason: 'Lesson',
      startTime: 's',
      endTime: 'e',
      blockType: 'lesson',
    });
    expect(result.court_id).toBe('c1');
    expect(result.title).toBe('Lesson');
    expect(result.block_type).toBe('lesson');
    expect(result.starts_at).toBe('s');
    expect(result.ends_at).toBe('e');
  });

  it('defaults blockType to maintenance', () => {
    const result = toCreateBlockPayload({ courtId: 'c1', reason: 'test', startTime: 's', endTime: 'e' });
    expect(result.block_type).toBe('maintenance');
  });
});

// ── toCancelBlockPayload ─────────────────────────────────────
describe('toCancelBlockPayload', () => {
  it('maps blockId', () => {
    expect(toCancelBlockPayload({ blockId: 'b1' }).block_id).toBe('b1');
  });
});

// ── toPurchaseBallsPayload ───────────────────────────────────
describe('toPurchaseBallsPayload', () => {
  it('maps basic purchase', () => {
    const result = toPurchaseBallsPayload({ sessionId: 's1', accountId: 'a1' });
    expect(result.session_id).toBe('s1');
    expect(result.account_id).toBe('a1');
    expect(result.split_balls).toBe(false);
    expect(result.split_account_ids).toBeNull();
  });

  it('maps split purchase', () => {
    const result = toPurchaseBallsPayload({
      sessionId: 's1',
      accountId: 'a1',
      splitBalls: true,
      splitAccountIds: ['a1', 'a2'],
    });
    expect(result.split_balls).toBe(true);
    expect(result.split_account_ids).toEqual(['a1', 'a2']);
  });
});

// ── toDeferWaitlistPayload ───────────────────────────────────
describe('toDeferWaitlistPayload', () => {
  it('maps defer payload', () => {
    const result = toDeferWaitlistPayload({ entryId: 'e1', deferred: true });
    expect(result.waitlist_id).toBe('e1');
    expect(result.deferred).toBe(true);
  });
});
