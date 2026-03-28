/**
 * Zod v4 validation error formatting — Bug #1
 *
 * All 11 command builders use `result.error.errors` to format
 * validation messages, but Zod v4 uses `.issues`. This causes
 * TypeError instead of a readable validation message.
 *
 * Test strategy: pass invalid input to representative builders,
 * assert the thrown error contains field-level info (not TypeError).
 */

import { describe, it, expect } from 'vitest';

import { buildAssignCourtCommand } from '../../../../src/lib/commands/assignCourt.js';
import { buildEndSessionCommand } from '../../../../src/lib/commands/endSession.js';
import { buildCreateBlockCommand } from '../../../../src/lib/commands/createBlock.js';

describe('Zod validation error formatting', () => {
  it('buildAssignCourtCommand formats field-level errors on invalid input', () => {
    // Missing required fields: courtId, players, groupType
    expect(() => buildAssignCourtCommand({})).toThrow(/Invalid AssignCourtCommand/);
    // Should NOT throw TypeError — that means .errors is undefined
    expect(() => buildAssignCourtCommand({})).not.toThrow(TypeError);
  });

  it('buildEndSessionCommand formats field-level errors on invalid input', () => {
    expect(() => buildEndSessionCommand({})).toThrow(/Invalid EndSessionCommand/);
    expect(() => buildEndSessionCommand({})).not.toThrow(TypeError);
  });

  it('buildCreateBlockCommand formats field-level errors on invalid input', () => {
    expect(() => buildCreateBlockCommand({})).toThrow(/Invalid CreateBlockCommand/);
    expect(() => buildCreateBlockCommand({})).not.toThrow(TypeError);
  });

  it('error message includes path and message from Zod issues', () => {
    try {
      buildAssignCourtCommand({ courtId: '', players: 'not-array', groupType: 'invalid' });
    } catch (e) {
      // Should contain field paths like "courtId" or "players"
      expect(e.message).toMatch(/courtId|players|groupType/);
      return;
    }
    // Should have thrown
    expect.unreachable('Expected buildAssignCourtCommand to throw');
  });
});
