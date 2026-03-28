import { describe, it, expect } from 'vitest';
import { preflightAssignFromWaitlist } from '../../../../src/lib/commands/assignFromWaitlist.js';

describe('preflightAssignFromWaitlist', () => {
  // Minimal fixtures
  const validWaitlistEntry = { id: 'entry-1', status: 'waiting' };
  const assignedWaitlistEntry = { id: 'entry-2', status: 'assigned' };
  const availableCourt = { id: 'court-1', number: 5, isAvailable: true };
  const unavailableCourt = { id: 'court-2', number: 7, isAvailable: false };

  it('returns ok:true when entry is waiting and court is available', () => {
    const command = { waitlistEntryId: 'entry-1', courtId: 'court-1' };
    const board = {
      waitlist: [validWaitlistEntry],
      courts: [availableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(true);
  });

  it('returns error when waitlist entry not found', () => {
    const command = { waitlistEntryId: 'nonexistent', courtId: 'court-1' };
    const board = {
      waitlist: [validWaitlistEntry],
      courts: [availableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(
      result.errors.some((e) => e.toLowerCase().includes('entry') && e.toLowerCase().includes('not found'))
    ).toBe(true);
  });

  it('returns error when entry status is not waiting', () => {
    const command = { waitlistEntryId: 'entry-2', courtId: 'court-1' };
    const board = {
      waitlist: [assignedWaitlistEntry],
      courts: [availableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(
      result.errors.some((e) => e.toLowerCase().includes('waiting') || e.toLowerCase().includes('no longer'))
    ).toBe(true);
  });

  it('returns error when court not found', () => {
    const command = { waitlistEntryId: 'entry-1', courtId: 'nonexistent' };
    const board = {
      waitlist: [validWaitlistEntry],
      courts: [availableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(
      result.errors.some((e) => e.toLowerCase().includes('court') && e.toLowerCase().includes('not found'))
    ).toBe(true);
  });

  it('returns error when court is not available', () => {
    const command = { waitlistEntryId: 'entry-1', courtId: 'court-2' };
    const board = {
      waitlist: [validWaitlistEntry],
      courts: [unavailableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((e) => e.toLowerCase().includes('not available'))).toBe(true);
  });

  // Contract: errors accumulate (not fail-fast) - confirmed from implementation
  it('accumulates multiple errors when both entry and court are invalid', () => {
    const command = { waitlistEntryId: 'nonexistent', courtId: 'also-nonexistent' };
    const board = {
      waitlist: [validWaitlistEntry],
      courts: [availableCourt],
    };

    const result = preflightAssignFromWaitlist(command, board);

    expect(result.ok).toBe(false);
    // Both entry not found AND court not found should be in errors
    expect(result.errors.length).toBe(2);
    expect(result.errors.some((e) => e.toLowerCase().includes('entry'))).toBe(true);
    expect(result.errors.some((e) => e.toLowerCase().includes('court'))).toBe(true);
  });
});
