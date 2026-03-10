/**
 * SuccessScreen render branch tests
 *
 * Tests the top-level isCourtAssignment branch, mobile header,
 * and WaitlistSuccess position/estimatedWait branches.
 *
 * CourtAssignmentSuccess deep branch coverage deferred to Commit B.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component import
// ---------------------------------------------------------------------------

// CourtAssignmentSuccess imports getUpcomingBlockWarningFromBlocks
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

// TournamentConfirmModal imports logger
vi.mock('../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// WaitlistSuccess + CourtAssignmentSuccess use TypedIcon
vi.mock('../../../src/components/icons/TypedIcon', () => ({
  TypedIcon: () => <span data-testid="typed-icon" />,
}));

// Avoid useBallPurchase async complexity (same pattern as smoke test)
vi.mock('../../../src/registration/screens/success/useBallPurchase.js', () => ({
  default: () => ({
    showBallPurchaseModal: false,
    setShowBallPurchaseModal: vi.fn(),
    ballPurchaseOption: '',
    setBallPurchaseOption: vi.fn(),
    ballsPurchased: false,
    purchaseDetails: null,
    isProcessingPurchase: false,
    handleBallPurchase: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import SuccessScreen from '../../../src/registration/screens/SuccessScreen.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};

function makeSuccessProps(overrides = {}) {
  return {
    isCourtAssignment: false,
    justAssignedCourt: null,
    assignedCourt: null,
    sessionId: null,
    assignedEndTime: null,
    replacedGroup: null,
    canChangeCourt: false,
    changeTimeRemaining: 0,
    position: 1,
    estimatedWait: 0,
    onChangeCourt: noop,
    onHome: vi.fn(),
    currentGroup: [{ name: 'Alice', memberNumber: '1001' }],
    isMobile: false,
    isTimeLimited: false,
    timeLimitReason: null,
    registrantStreak: 0,
    ballPriceCents: 500,
    onPurchaseBalls: noop,
    onLookupMemberAccount: noop,
    onUpdateSessionTournament: noop,
    TENNIS_CONFIG: { PRICING: { TENNIS_BALLS: 5 } },
    getCourtBlockStatus: () => null,
    upcomingBlocks: [],
    blockWarningMinutes: 60,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A) Top-level branch: isCourtAssignment
// ---------------------------------------------------------------------------

describe('SuccessScreen top-level branches', () => {
  it('renders waitlist content when isCourtAssignment=false', () => {
    render(<SuccessScreen {...makeSuccessProps({ isCourtAssignment: false, position: 2 })} />);
    expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    expect(screen.queryByText('Confirmed!')).not.toBeInTheDocument();
  });

  it('renders court assignment content when isCourtAssignment=true', () => {
    render(
      <SuccessScreen
        {...makeSuccessProps({
          isCourtAssignment: true,
          justAssignedCourt: 5,
        })}
      />
    );
    expect(screen.getByText('Confirmed!')).toBeInTheDocument();
    expect(screen.getByText('Court 5')).toBeInTheDocument();
    expect(screen.queryByText("You're on the list!")).not.toBeInTheDocument();
  });

  it('hides Home button when isMobile=true, shows on desktop', () => {
    const { unmount } = render(
      <SuccessScreen {...makeSuccessProps({ isMobile: true, position: 2 })} />
    );
    expect(screen.queryByTestId('success-home-btn')).not.toBeInTheDocument();
    unmount();

    render(<SuccessScreen {...makeSuccessProps({ isMobile: false, position: 2 })} />);
    expect(screen.getByTestId('success-home-btn')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) WaitlistSuccess position branches
// ---------------------------------------------------------------------------

describe('SuccessScreen waitlist position branches', () => {
  it('shows "N groups ahead" when position > 2', () => {
    render(<SuccessScreen {...makeSuccessProps({ position: 4 })} />);
    expect(screen.getByText(/3 groups/)).toBeInTheDocument();
    expect(screen.getByText(/ahead of you/)).toBeInTheDocument();
  });

  it('shows "1 group ahead" when position === 2', () => {
    render(<SuccessScreen {...makeSuccessProps({ position: 2 })} />);
    expect(screen.getByText(/1 group/)).toBeInTheDocument();
    expect(screen.getByText(/ahead of you/)).toBeInTheDocument();
  });

  it('shows "next in line" when position === 1', () => {
    render(<SuccessScreen {...makeSuccessProps({ position: 1 })} />);
    expect(screen.getByText(/next/)).toBeInTheDocument();
    expect(screen.getByText(/in line/)).toBeInTheDocument();
  });

  it('shows estimated wait when estimatedWait > 0', () => {
    render(<SuccessScreen {...makeSuccessProps({ position: 2, estimatedWait: 15 })} />);
    expect(screen.getByText(/Estimated wait/)).toBeInTheDocument();
    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it('hides estimated wait when estimatedWait === 0', () => {
    render(<SuccessScreen {...makeSuccessProps({ position: 2, estimatedWait: 0 })} />);
    expect(screen.queryByText(/Estimated wait/)).not.toBeInTheDocument();
  });
});
