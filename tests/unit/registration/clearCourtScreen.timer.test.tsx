/**
 * ClearCourtScreen timer/auto-reset tests
 *
 * Tests the useEffect timer that calls resetForm after
 * AUTO_RESET_CLEAR_MS on success screens (steps 3 and 4).
 *
 * Isolated from render tests to contain vi.useFakeTimers() scope.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component import
// ---------------------------------------------------------------------------

vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

vi.mock('../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/lib/storage.js', () => ({
  readDataSafe: vi.fn(() => ({ courts: [] })),
}));

vi.mock('../../../src/components/icons/TypedIcon', () => ({
  TypedIcon: () => <span data-testid="typed-icon" />,
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import ClearCourtScreen from '../../../src/registration/screens/ClearCourtScreen.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTO_RESET_MS = 3000;

function makeClearCourtProps(overrides = {}) {
  return {
    clearCourtStep: 1,
    setClearCourtStep: vi.fn(),
    selectedCourtToClear: 3,
    setSelectedCourtToClear: vi.fn(),
    clearCourt: vi.fn(),
    resetForm: vi.fn(),
    showAlert: false,
    alertMessage: '',
    getCourtsOccupiedForClearing: () => [3],
    courtData: { courts: [] },
    CONSTANTS: { AUTO_RESET_CLEAR_MS: AUTO_RESET_MS },
    TennisBusinessLogic: { formatPlayerDisplayName: (n) => n },
    mobileFlow: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClearCourtScreen auto-reset timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls resetForm after AUTO_RESET_CLEAR_MS on step 3', () => {
    const resetForm = vi.fn();
    render(<ClearCourtScreen {...makeClearCourtProps({ clearCourtStep: 3, resetForm })} />);

    expect(resetForm).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTO_RESET_MS);
    });

    expect(resetForm).toHaveBeenCalledOnce();
  });

  it('calls resetForm after AUTO_RESET_CLEAR_MS on step 4', () => {
    const resetForm = vi.fn();
    render(<ClearCourtScreen {...makeClearCourtProps({ clearCourtStep: 4, resetForm })} />);

    expect(resetForm).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTO_RESET_MS);
    });

    expect(resetForm).toHaveBeenCalledOnce();
  });

  it('does not call resetForm on step 1', () => {
    const resetForm = vi.fn();
    render(<ClearCourtScreen {...makeClearCourtProps({ clearCourtStep: 1, resetForm })} />);

    act(() => {
      vi.advanceTimersByTime(AUTO_RESET_MS * 2);
    });

    expect(resetForm).not.toHaveBeenCalled();
  });

  it('does not call resetForm on step 2', () => {
    const resetForm = vi.fn();
    render(
      <ClearCourtScreen
        {...makeClearCourtProps({
          clearCourtStep: 2,
          resetForm,
          courtData: { courts: [{ number: 3, players: [] }] },
        })}
      />
    );

    act(() => {
      vi.advanceTimersByTime(AUTO_RESET_MS * 2);
    });

    expect(resetForm).not.toHaveBeenCalled();
  });
});
