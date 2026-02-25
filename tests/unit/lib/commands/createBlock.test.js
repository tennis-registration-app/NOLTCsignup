/**
 * createBlock command tests — build, validate, preflight, payload
 */

import { describe, it, expect } from 'vitest';
import {
  buildCreateBlockCommand,
  preflightCreateBlock,
  toCreateBlockPayload,
} from '../../../../src/lib/commands/createBlock.js';

const validInput = {
  courtId: 'court-1',
  startsAt: '2025-01-15T10:00:00Z',
  endsAt: '2025-01-15T11:00:00Z',
  reason: 'Lesson',
};

// ── buildCreateBlockCommand ─────────────────────────────────
describe('buildCreateBlockCommand', () => {
  it('builds valid command', () => {
    const cmd = buildCreateBlockCommand(validInput);
    expect(cmd.courtId).toBe('court-1');
    expect(cmd.commandVersion).toBe('1.0');
    expect(cmd.startsAt).toBe('2025-01-15T10:00:00Z');
    expect(cmd.endsAt).toBe('2025-01-15T11:00:00Z');
    expect(cmd.reason).toBe('Lesson');
  });

  it('throws for missing courtId', () => {
    expect(() => buildCreateBlockCommand({ ...validInput, courtId: '' })).toThrow('Invalid');
  });

  it('throws for missing startsAt', () => {
    expect(() => buildCreateBlockCommand({ ...validInput, startsAt: '' })).toThrow('Invalid');
  });

  it('throws for missing endsAt', () => {
    expect(() => buildCreateBlockCommand({ ...validInput, endsAt: '' })).toThrow('Invalid');
  });

  it('throws for missing reason', () => {
    expect(() => buildCreateBlockCommand({ ...validInput, reason: '' })).toThrow('Invalid');
  });
});

// ── preflightCreateBlock ────────────────────────────────────
describe('preflightCreateBlock', () => {
  const cmd = buildCreateBlockCommand(validInput);

  it('returns ok when court found and times valid', () => {
    const board = { courts: [{ id: 'court-1' }] };
    expect(preflightCreateBlock(cmd, board)).toEqual({ ok: true });
  });

  it('errors when court not found', () => {
    const board = { courts: [{ id: 'other' }] };
    const result = preflightCreateBlock(cmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Court not found');
  });

  it('errors for invalid start time', () => {
    const badCmd = { ...cmd, startsAt: 'not-a-date' };
    const board = { courts: [{ id: 'court-1' }] };
    const result = preflightCreateBlock(badCmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Invalid start time');
  });

  it('errors for invalid end time', () => {
    const badCmd = { ...cmd, endsAt: 'not-a-date' };
    const board = { courts: [{ id: 'court-1' }] };
    const result = preflightCreateBlock(badCmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Invalid end time');
  });

  it('errors when end time equals start time', () => {
    const badCmd = { ...cmd, endsAt: cmd.startsAt };
    const board = { courts: [{ id: 'court-1' }] };
    const result = preflightCreateBlock(badCmd, board);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('End time must be after start time');
  });

  it('errors when end time before start time', () => {
    const badCmd = { ...cmd, startsAt: '2025-01-15T12:00:00Z', endsAt: '2025-01-15T10:00:00Z' };
    const board = { courts: [{ id: 'court-1' }] };
    const result = preflightCreateBlock(badCmd, board);
    expect(result.ok).toBe(false);
  });

  it('handles null board', () => {
    const result = preflightCreateBlock(cmd, null);
    expect(result.ok).toBe(false);
  });
});

// ── toCreateBlockPayload ────────────────────────────────────
describe('toCreateBlockPayload (command)', () => {
  it('converts to API payload', () => {
    const cmd = buildCreateBlockCommand(validInput);
    const payload = toCreateBlockPayload(cmd);
    expect(payload.court_id).toBe('court-1');
    expect(payload.starts_at).toBe('2025-01-15T10:00:00Z');
    expect(payload.ends_at).toBe('2025-01-15T11:00:00Z');
    expect(payload.reason).toBe('Lesson');
  });
});
