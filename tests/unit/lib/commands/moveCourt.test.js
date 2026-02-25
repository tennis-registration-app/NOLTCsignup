/**
 * moveCourt command tests — build, validate, preflight, payload
 */

import { describe, it, expect } from 'vitest';
import {
  buildMoveCourtCommand,
  preflightMoveCourt,
  toMoveCourtPayload,
} from '../../../../src/lib/commands/moveCourt.js';

const validInput = {
  fromCourtId: 'court-1',
  toCourtId: 'court-2',
};

// ── buildMoveCourtCommand ───────────────────────────────────
describe('buildMoveCourtCommand', () => {
  it('builds valid command', () => {
    const cmd = buildMoveCourtCommand(validInput);
    expect(cmd.fromCourtId).toBe('court-1');
    expect(cmd.toCourtId).toBe('court-2');
    expect(cmd.commandVersion).toBe('1.0');
  });

  it('throws for missing fromCourtId', () => {
    expect(() => buildMoveCourtCommand({ fromCourtId: '', toCourtId: 'c2' })).toThrow('Invalid');
  });

  it('throws for missing toCourtId', () => {
    expect(() => buildMoveCourtCommand({ fromCourtId: 'c1', toCourtId: '' })).toThrow('Invalid');
  });

  it('throws when fromCourtId equals toCourtId', () => {
    expect(() => buildMoveCourtCommand({ fromCourtId: 'c1', toCourtId: 'c1' })).toThrow(
      'Invalid'
    );
  });
});

// ── preflightMoveCourt ──────────────────────────────────────
describe('preflightMoveCourt', () => {
  const cmd = buildMoveCourtCommand(validInput);

  it('returns ok when source has session and destination available', () => {
    const board = {
      courts: [
        { id: 'court-1', number: 1, session: { group: {} }, isAvailable: false },
        { id: 'court-2', number: 2, isAvailable: true },
      ],
    };
    expect(preflightMoveCourt(cmd, board)).toEqual({ ok: true });
  });

  it('errors when source not found', () => {
    const board = { courts: [{ id: 'court-2', isAvailable: true, number: 2 }] };
    const result = preflightMoveCourt(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Source court not found');
  });

  it('errors when source has no session', () => {
    const board = {
      courts: [
        { id: 'court-1', number: 1, session: null },
        { id: 'court-2', number: 2, isAvailable: true },
      ],
    };
    const result = preflightMoveCourt(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Source court has no active session');
  });

  it('errors when destination not found', () => {
    const board = {
      courts: [{ id: 'court-1', number: 1, session: { group: {} } }],
    };
    const result = preflightMoveCourt(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Destination court not found');
  });

  it('errors when destination is occupied', () => {
    const board = {
      courts: [
        { id: 'court-1', number: 1, session: { group: {} } },
        { id: 'court-2', number: 2, isAvailable: false, isOccupied: true },
      ],
    };
    const result = preflightMoveCourt(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('occupied');
  });

  it('errors when destination is blocked', () => {
    const board = {
      courts: [
        { id: 'court-1', number: 1, session: { group: {} } },
        { id: 'court-2', number: 2, isAvailable: false, isBlocked: true },
      ],
    };
    const result = preflightMoveCourt(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('blocked');
  });

  it('handles null board', () => {
    const result = preflightMoveCourt(cmd, null);
    expect(result.ok).toBe(false);
  });
});

// ── toMoveCourtPayload ──────────────────────────────────────
describe('toMoveCourtPayload (command)', () => {
  it('converts to API payload', () => {
    const cmd = buildMoveCourtCommand(validInput);
    const payload = toMoveCourtPayload(cmd);
    expect(payload.from_court_id).toBe('court-1');
    expect(payload.to_court_id).toBe('court-2');
  });
});
