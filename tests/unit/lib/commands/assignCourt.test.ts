/**
 * assignCourt command tests — build, validate, preflight, payload
 */

import { describe, it, expect } from 'vitest';
import {
  buildAssignCourtCommand,
  preflightAssignCourt,
  toAssignCourtPayload,
} from '../../../../src/lib/commands/assignCourt.js';

const validInput = {
  courtId: 'court-1',
  players: [{ memberId: 'm1', displayName: 'Alice', isGuest: false }],
  groupType: 'singles',
  durationMinutes: 60,
};

// ── buildAssignCourtCommand ─────────────────────────────────
describe('buildAssignCourtCommand', () => {
  it('builds valid command', () => {
    const cmd = buildAssignCourtCommand(validInput);
    expect(cmd.courtId).toBe('court-1');
    expect(cmd.commandVersion).toBe('1.0');
    expect(cmd.players).toHaveLength(1);
    expect(cmd.groupType).toBe('singles');
    expect(cmd.durationMinutes).toBe(60);
  });

  it('applies default durationMinutes', () => {
    const { durationMinutes, ...rest } = validInput;
    const cmd = buildAssignCourtCommand(rest);
    expect(cmd.durationMinutes).toBe(60);
  });

  it('throws for missing courtId', () => {
    expect(() => buildAssignCourtCommand({ ...validInput, courtId: '' })).toThrow('Invalid');
  });

  it('throws for empty players', () => {
    expect(() => buildAssignCourtCommand({ ...validInput, players: [] })).toThrow('Invalid');
  });

  it('throws for too many players', () => {
    const players = Array.from({ length: 5 }, (_, i) => ({
      memberId: `m${i}`,
      displayName: `P${i}`,
      isGuest: false,
    }));
    expect(() => buildAssignCourtCommand({ ...validInput, players })).toThrow('Invalid');
  });

  it('throws for invalid groupType', () => {
    expect(() => buildAssignCourtCommand({ ...validInput, groupType: 'invalid' })).toThrow(
      'Invalid'
    );
  });

  it('throws for player missing memberId', () => {
    expect(() =>
      buildAssignCourtCommand({
        ...validInput,
        players: [{ displayName: 'X', isGuest: false }],
      })
    ).toThrow('Invalid');
  });
});

// ── preflightAssignCourt ────────────────────────────────────
describe('preflightAssignCourt', () => {
  const cmd = buildAssignCourtCommand(validInput);

  it('returns ok when court is available', () => {
    const board = {
      courts: [{ id: 'court-1', isAvailable: true, number: 1 }],
      waitlist: [],
    };
    expect(preflightAssignCourt(cmd, board as any)).toEqual({ ok: true });
  });

  it('errors when court not found', () => {
    const board = { courts: [{ id: 'other', isAvailable: true }], waitlist: [] };
    const result = preflightAssignCourt(cmd, board as any);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Court not found');
  });

  it('errors when court is occupied', () => {
    const board = {
      courts: [{ id: 'court-1', isAvailable: false, isOccupied: true, number: 1 }],
      waitlist: [],
    };
    const result = preflightAssignCourt(cmd, board as any);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('occupied');
  });

  it('errors when court is blocked', () => {
    const board = {
      courts: [{ id: 'court-1', isAvailable: false, isBlocked: true, number: 1 }],
      waitlist: [],
    };
    const result = preflightAssignCourt(cmd, board as any);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('blocked');
  });

  it('errors when court is not available (generic)', () => {
    const board = {
      courts: [{ id: 'court-1', isAvailable: false, number: 1 }],
      waitlist: [],
    };
    const result = preflightAssignCourt(cmd, board as any);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('not available');
  });

  it('errors when player already engaged on court', () => {
    const board = {
      courts: [
        { id: 'court-1', isAvailable: true, number: 1 },
        {
          id: 'court-2',
          number: 2,
          session: { group: { id: 'g', players: [{ memberId: 'm1', displayName: 'Alice' }] } },
        },
      ],
      waitlist: [],
    };
    const result = preflightAssignCourt(cmd, board as any);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('already playing');
  });

  it('handles null board', () => {
    const result = preflightAssignCourt(cmd, null);
    expect(result.ok).toBe(false);
  });
});

// ── toAssignCourtPayload ────────────────────────────────────
describe('toAssignCourtPayload (command)', () => {
  it('converts camelCase to snake_case', () => {
    const cmd = buildAssignCourtCommand(validInput);
    const payload = toAssignCourtPayload(cmd);
    expect(payload.court_id).toBe('court-1');
    expect(payload.group_type).toBe('singles');
    expect(payload.duration_minutes).toBe(60);
    expect(payload.players[0].member_id).toBe('m1');
    expect(payload.players[0].display_name).toBe('Alice');
    expect(payload.players[0].is_guest).toBe(false);
  });
});
