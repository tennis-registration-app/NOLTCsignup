/**
 * GroupScreen rendering branch tests
 *
 * Tests key rendering branches for GroupScreen (direct import).
 * No interaction tests — rendering only.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component imports
// ---------------------------------------------------------------------------

// @lib via components barrel → QRScanner transitive dep
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

vi.mock('../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import GroupScreen from '../../../src/registration/screens/GroupScreen.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};

function makeGroupProps(overrides = {}) {
  const courtSelectionStub = { getSelectableForGroup: () => [] };
  return {
    // Data
    data: { courtSelection: courtSelectionStub, waitlist: [] },
    currentGroup: [{ name: 'Alice', memberNumber: '1001' }],
    memberNumber: '1001',
    availableCourts: [1, 2, 3],
    courtSelection: courtSelectionStub,
    frequentPartners: [],
    frequentPartnersLoading: false,
    // UI state
    showAlert: false,
    alertMessage: '',
    showTimeoutWarning: false,
    isMobileView: false,
    // Mobile flow
    mobileFlow: false,
    preselectedCourt: null,
    // Search state
    searchInput: '',
    showSuggestions: false,
    effectiveSearchInput: '',
    // Add player state
    _showAddPlayer: true,
    addPlayerSearch: '',
    showAddPlayerSuggestions: false,
    effectiveAddPlayerSearch: '',
    // Guest form state
    showGuestForm: false,
    guestName: '',
    guestSponsor: '',
    showGuestNameError: false,
    showSponsorError: false,
    // Callbacks
    onSearchChange: noop,
    onSearchFocus: noop,
    onSuggestionClick: noop,
    onAddPlayerSearchChange: noop,
    onAddPlayerSearchFocus: noop,
    onAddPlayerSuggestionClick: noop,
    _onToggleAddPlayer: noop,
    onToggleGuestForm: noop,
    onRemovePlayer: noop,
    onSelectSponsor: noop,
    onGuestNameChange: noop,
    onAddGuest: noop,
    onCancelGuest: noop,
    onAddFrequentPartner: noop,
    onSelectCourt: noop,
    isAssigning: false,
    onJoinWaitlist: noop,
    joiningWaitlist: false,
    onGoBack: noop,
    onStartOver: noop,
    // Utilities
    getAutocompleteSuggestions: () => [],
    isPlayerAlreadyPlaying: () => ({ isPlaying: false }),
    sameGroup: () => false,
    CONSTANTS: { MAX_PLAYERS: 4, MAX_FREQUENT_PARTNERS: 5 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupScreen rendering', () => {
  it('renders welcome message with first player name', () => {
    render(<GroupScreen {...makeGroupProps()} />);
    const welcome = screen.getByText(/Welcome/);
    expect(welcome).toBeInTheDocument();
    // Player name rendered inside <strong> within the welcome message
    expect(welcome.querySelector('strong').textContent).toBe('Alice');
  });

  it('renders player cards with remove buttons for non-first players', () => {
    const props = makeGroupProps({
      currentGroup: [
        { name: 'Alice', memberNumber: '1001' },
        { name: 'Bob', memberNumber: '1002' },
        { name: 'Carol', memberNumber: '1003' },
      ],
    });
    render(<GroupScreen {...props} />);

    // All player names rendered (names also appear in GuestFormInline sponsor buttons)
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carol').length).toBeGreaterThanOrEqual(1);

    // Remove buttons for non-first players only
    expect(screen.queryByLabelText('Remove Alice')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remove Bob')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Carol')).toBeInTheDocument();
  });

  it('shows "Add Another Player" section when below max players', () => {
    render(<GroupScreen {...makeGroupProps()} />);
    expect(screen.getByText('Add Another Player')).toBeInTheDocument();
  });

  it('hides "Add Another Player" section when group is full', () => {
    const props = makeGroupProps({
      currentGroup: [
        { name: 'Alice', memberNumber: '1001' },
        { name: 'Bob', memberNumber: '1002' },
        { name: 'Carol', memberNumber: '1003' },
        { name: 'Dave', memberNumber: '1004' },
      ],
    });
    render(<GroupScreen {...props} />);
    expect(screen.queryByText('Add Another Player')).not.toBeInTheDocument();
  });

  it('shows guest form heading when showGuestForm = true', () => {
    const props = makeGroupProps({ showGuestForm: true });
    render(<GroupScreen {...props} />);
    expect(screen.getByText('Add Guest Player')).toBeInTheDocument();
    // "Add Another Player" heading replaced by guest heading
    expect(screen.queryByText('Add Another Player')).not.toBeInTheDocument();
  });

  it('renders MobileGroupSearchModal when mobileFlow=true and no players', () => {
    const props = makeGroupProps({
      mobileFlow: true,
      preselectedCourt: 5,
      currentGroup: [],
    });
    render(<GroupScreen {...props} />);
    // MobileGroupSearchModal shows court indicator
    expect(screen.getByText(/Court 5/)).toBeInTheDocument();
    // Desktop welcome message not shown
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
  });

  it('renders full GroupScreen with court header when mobileFlow=true and players exist', () => {
    const props = makeGroupProps({
      mobileFlow: true,
      preselectedCourt: 3,
      currentGroup: [{ name: 'Alice', memberNumber: '1001' }],
    });
    render(<GroupScreen {...props} />);
    // Mobile court header shown
    expect(screen.getByText('Court 3 Selected')).toBeInTheDocument();
    // Desktop welcome NOT shown (mobile branch renders court header instead)
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
    // Player still rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
