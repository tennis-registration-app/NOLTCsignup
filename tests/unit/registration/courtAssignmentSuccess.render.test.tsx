/**
 * CourtAssignmentSuccess render branch tests
 *
 * Tests the render branches of the CourtAssignmentSuccess function
 * in isolation. Called as a function (not JSX component) by SuccessScreen,
 * returning { mainContent, footerContent }.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component import
// ---------------------------------------------------------------------------

// Direct import in CourtAssignmentSuccess
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

// Transitive via registration components barrel
vi.mock('../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Direct import in CourtAssignmentSuccess
vi.mock('../../../src/components/icons/TypedIcon', () => ({
  TypedIcon: () => <span data-testid="typed-icon" />,
}));

// ---------------------------------------------------------------------------
// Component + mock imports (after mocks)
// ---------------------------------------------------------------------------

import CourtAssignmentSuccess from '../../../src/registration/screens/success/CourtAssignmentSuccess.jsx';
import { getUpcomingBlockWarningFromBlocks } from '@lib';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};

/** Props that enable the assignedCourt conditional block (end time display + nested branches) */
const withEndTime = {
  assignedCourt: { session: { scheduledEndAt: '2025-06-15T14:00:00Z' } },
  assignedEndTime: '2025-06-15T14:00:00Z',
};

function makeProps(overrides = {}) {
  return {
    // Data
    justAssignedCourt: 3,
    assignedCourt: null,
    assignedEndTime: null,
    replacedGroup: null,
    upcomingBlocks: [],
    blockWarningMinutes: 60,
    registrantStreak: 0,
    // State
    isTournament: false,
    isTimeLimited: false,
    timeLimitReason: null,
    // Ball purchase
    ballsPurchased: false,
    purchaseDetails: null,
    ballPrice: 5.0,
    splitPrice: 2.5,
    // Handlers
    canChangeCourt: false,
    changeTimeRemaining: 0,
    isMobile: false,
    onChangeCourt: noop,
    onOpenBallPurchase: noop,
    onOpenTournamentConfirm: noop,
    // Utilities
    getCourtBlockStatus: () => null,
    ...overrides,
  };
}

function renderCourtAssignment(props) {
  const { mainContent, footerContent } = CourtAssignmentSuccess(props);
  return render(
    <>
      {mainContent}
      {footerContent}
    </>
  );
}

// ---------------------------------------------------------------------------
// A) Main content branches
// ---------------------------------------------------------------------------

describe('CourtAssignmentSuccess main content', () => {
  it('renders Confirmed heading and court number', () => {
    renderCourtAssignment(makeProps());
    expect(screen.getByText('Confirmed!')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();
  });

  it('shows Priority until time when not tournament', () => {
    renderCourtAssignment(makeProps({ ...withEndTime }));
    expect(screen.getByTestId('priority-until')).toBeInTheDocument();
    expect(screen.getByText(/Priority until/)).toBeInTheDocument();
    expect(screen.queryByTestId('tournament-badge')).not.toBeInTheDocument();
  });

  it('shows tournament badge when isTournament=true', () => {
    renderCourtAssignment(makeProps({ ...withEndTime, isTournament: true }));
    expect(screen.getByTestId('tournament-badge')).toBeInTheDocument();
    expect(screen.getByText(/Tournament Match/)).toBeInTheDocument();
    expect(screen.queryByTestId('priority-until')).not.toBeInTheDocument();
  });

  it('shows time-limited notice for rereg', () => {
    renderCourtAssignment(
      makeProps({ ...withEndTime, isTimeLimited: true, timeLimitReason: 'rereg' })
    );
    expect(screen.getByText(/Remaining time from previous session/)).toBeInTheDocument();
  });

  it('shows time-limited notice for upcoming reservation', () => {
    renderCourtAssignment(
      makeProps({ ...withEndTime, isTimeLimited: true, timeLimitReason: 'block' })
    );
    expect(
      screen.getByText(/Time limited due to upcoming court reservation/)
    ).toBeInTheDocument();
  });

  it('shows replaced group notice', () => {
    renderCourtAssignment(
      makeProps({
        ...withEndTime,
        replacedGroup: { players: [{ name: 'Bob' }] },
      })
    );
    expect(screen.getByText(/Please courteously request Bob/)).toBeInTheDocument();
  });

  it('shows singular streak warning for streak=1', () => {
    renderCourtAssignment(makeProps({ ...withEndTime, registrantStreak: 1 }));
    expect(
      screen.getByText(/Your last session was ended without using/)
    ).toBeInTheDocument();
  });

  it('shows plural streak warning for streak=2', () => {
    renderCourtAssignment(makeProps({ ...withEndTime, registrantStreak: 2 }));
    expect(
      screen.getByText(/Your last 2 sessions were ended without using/)
    ).toBeInTheDocument();
  });

  it('shows block warning when upcoming block is within threshold', () => {
    getUpcomingBlockWarningFromBlocks.mockReturnValueOnce({
      minutesUntilBlock: 30,
      reason: 'Lessons',
      startTime: '2025-06-15T15:00:00Z',
    });
    renderCourtAssignment(makeProps({ ...withEndTime }));
    expect(screen.getByText(/Note: Court reserved for Lessons/)).toBeInTheDocument();
  });

  it('shows court block status notice', () => {
    renderCourtAssignment(
      makeProps({
        ...withEndTime,
        getCourtBlockStatus: () => ({
          isBlocked: true,
          startTime: '2025-06-15T13:00:00Z',
          reason: 'Lessons',
        }),
      })
    );
    expect(screen.getByText(/Limited due to Lessons/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) Footer content branches
// ---------------------------------------------------------------------------

describe('CourtAssignmentSuccess footer content', () => {
  it('shows pre-purchase footer with Add Balls and Tournament link', () => {
    renderCourtAssignment(makeProps());
    expect(screen.getByText('Add Balls')).toBeInTheDocument();
    expect(screen.getByTestId('tournament-match-link')).toBeInTheDocument();
  });

  it('shows post-purchase confirmation for single charge', () => {
    renderCourtAssignment(
      makeProps({
        ballsPurchased: true,
        purchaseDetails: { type: 'single', accounts: ['1234'] },
      })
    );
    expect(screen.getByText(/Balls Added/)).toBeInTheDocument();
    expect(screen.getByText(/\$5\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Charged to account:/)).toBeInTheDocument();
    expect(screen.getByText(/1234/)).toBeInTheDocument();
  });

  it('shows post-purchase confirmation for split charge', () => {
    renderCourtAssignment(
      makeProps({
        ballsPurchased: true,
        purchaseDetails: { type: 'split', accounts: ['1234', '5678'] },
      })
    );
    expect(screen.getByText(/\$2\.50 each/)).toBeInTheDocument();
    expect(screen.getByText(/Charged to accounts:/)).toBeInTheDocument();
    expect(screen.getByText(/1234, 5678/)).toBeInTheDocument();
  });
});
