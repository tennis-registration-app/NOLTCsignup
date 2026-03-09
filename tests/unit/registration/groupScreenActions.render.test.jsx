/**
 * GroupScreenActions render/decision-branch tests
 *
 * Tests the computeShowSelectCourt logic, button text variants,
 * disabled states, and layout branches.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// No mocks needed — GroupScreenActions imports only:
//   isCourtEligibleForGroup (pure fn from domain.js)
//   LoadingBorderSpinner (pure React SVG component)

import GroupScreenActions from '../../../src/registration/screens/group/GroupScreenActions.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};

function makeActionsProps(overrides = {}) {
  const courtSelectionStub = {
    getSelectableForGroup: () => [{ number: 1 }, { number: 2 }],
  };
  return {
    // Data
    data: { waitlist: [] },
    currentGroup: [{ name: 'Alice', memberNumber: '1001' }],
    availableCourts: [1, 2],
    courtSelection: courtSelectionStub,
    // UI state
    isMobileView: false,
    mobileFlow: false,
    preselectedCourt: null,
    showGuestForm: false,
    isAssigning: false,
    joiningWaitlist: false,
    // Callbacks
    onGoBack: noop,
    onSelectCourt: noop,
    onJoinWaitlist: noop,
    onStartOver: noop,
    // Utilities
    sameGroup: () => false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A) computeShowSelectCourt decision branches
// ---------------------------------------------------------------------------

describe('GroupScreenActions court/waitlist decision', () => {
  it('shows "Select a Court" when no waitlist and courts available', () => {
    render(<GroupScreenActions {...makeActionsProps()} />);
    expect(screen.getByText('Select a Court')).toBeInTheDocument();
    expect(screen.queryByText('Join Waitlist')).not.toBeInTheDocument();
  });

  it('shows "Join Waitlist" when no courts available', () => {
    const props = makeActionsProps({
      availableCourts: [],
      courtSelection: { getSelectableForGroup: () => [] },
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
    expect(screen.queryByText('Select a Court')).not.toBeInTheDocument();
  });

  it('shows "Select a Court" when group is position 1 in active waitlist', () => {
    const group = [{ name: 'Alice', memberNumber: '1001', memberId: 'm1' }];
    const props = makeActionsProps({
      currentGroup: group,
      data: {
        waitlist: [
          { players: [{ memberId: 'm1' }] },
          { players: [{ memberId: 'm2' }] },
        ],
      },
      // sameGroup returns true for the first entry
      sameGroup: (entryPlayers, cg) =>
        entryPlayers[0]?.memberId === 'm1' && cg === group,
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Select a Court')).toBeInTheDocument();
  });

  it('shows "Join Waitlist" when group is position 3+ in waitlist', () => {
    const group = [{ name: 'Carol', memberNumber: '1003', memberId: 'm3' }];
    const props = makeActionsProps({
      currentGroup: group,
      data: {
        waitlist: [
          { players: [{ memberId: 'm1' }] },
          { players: [{ memberId: 'm2' }] },
          { players: [{ memberId: 'm3' }] },
        ],
      },
      sameGroup: (entryPlayers, cg) =>
        entryPlayers[0]?.memberId === 'm3' && cg === group,
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) Button text variants
// ---------------------------------------------------------------------------

describe('GroupScreenActions button text', () => {
  it('shows "Assigning Court..." when isAssigning = true', () => {
    const props = makeActionsProps({ isAssigning: true });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Assigning Court...')).toBeInTheDocument();
  });

  it('shows "Joining Waitlist..." when joiningWaitlist = true', () => {
    const props = makeActionsProps({
      joiningWaitlist: true,
      availableCourts: [],
      courtSelection: { getSelectableForGroup: () => [] },
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Joining Waitlist...')).toBeInTheDocument();
  });

  it('shows "Register for Court N" when mobileFlow + preselectedCourt on desktop', () => {
    const props = makeActionsProps({
      mobileFlow: true,
      preselectedCourt: 5,
      isMobileView: false,
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Register for Court 5')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C) Button disabled states
// ---------------------------------------------------------------------------

describe('GroupScreenActions disabled states', () => {
  it('disables Select Court button when showGuestForm = true', () => {
    const props = makeActionsProps({ showGuestForm: true });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByTestId('reg-submit-btn')).toBeDisabled();
  });

  it('disables Join Waitlist button when showGuestForm = true', () => {
    const props = makeActionsProps({
      showGuestForm: true,
      availableCourts: [],
      courtSelection: { getSelectableForGroup: () => [] },
    });
    render(<GroupScreenActions {...props} />);
    expect(screen.getByText('Join Waitlist')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// D) Layout branches
// ---------------------------------------------------------------------------

describe('GroupScreenActions layout', () => {
  it('hides Start Over on mobile, shows on desktop', () => {
    const { unmount } = render(
      <GroupScreenActions {...makeActionsProps({ isMobileView: true })} />
    );
    expect(screen.queryByText('Start Over')).not.toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    unmount();

    render(<GroupScreenActions {...makeActionsProps({ isMobileView: false })} />);
    expect(screen.getByText('Start Over')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });
});
