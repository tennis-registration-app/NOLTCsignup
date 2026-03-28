/**
 * HomeScreen rendering + HomeRoute overlay tests
 *
 * Tests rendering branches for HomeScreen (direct import) and
 * HomeRoute (location-checking overlay logic).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component imports
// ---------------------------------------------------------------------------

// toast util used by HomeScreen
vi.mock('../../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
}));

// Mock WorkflowContext — HomeRoute now reads workflow setters from useWorkflowContext()
const noop = () => {};

vi.mock('../../../src/registration/context/WorkflowProvider', () => ({
  useWorkflowContext: () => ({
    groupGuest: { setCurrentGroup: noop },
    memberIdentity: { setMemberNumber: noop },
    setHasWaitlistPriority: noop,
    setCurrentWaitlistEntryId: noop,
  }),
}));

// Transitive deps loaded through screens barrel (HomeRoute imports all screens)
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
  TennisBusinessLogic: { formatPlayerDisplayName: (n) => n },
}));
vi.mock('../../../src/lib/storage.js', () => ({
  readDataSafe: vi.fn(() => ({ courts: [] })),
}));
vi.mock('../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../src/components/icons/TypedIcon', () => ({
  TypedIcon: (props) => <span data-testid="typed-icon" />,
}));
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
// Component imports (after mocks)
// ---------------------------------------------------------------------------

import HomeScreen from '../../../src/registration/screens/HomeScreen.jsx';
import { HomeRoute } from '../../../src/registration/router/routes/HomeRoute.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHomeProps(overrides = {}) {
  return {
    searchInput: '',
    setSearchInput: noop,
    showSuggestions: false,
    setShowSuggestions: noop,
    isSearching: false,
    effectiveSearchInput: '',
    getAutocompleteSuggestions: () => [],
    handleSuggestionClick: noop,
    markUserTyping: noop,
    setCurrentScreen: noop,
    setCurrentGroup: noop,
    setMemberNumber: noop,
    setHasWaitlistPriority: noop,
    setCurrentWaitlistEntryId: noop,
    findMemberNumber: () => '',
    canFirstGroupPlay: false,
    canSecondGroupPlay: false,
    firstWaitlistEntry: null,
    secondWaitlistEntry: null,
    firstWaitlistEntryData: null,
    secondWaitlistEntryData: null,
    canPassThroughGroupPlay: false,
    passThroughEntry: null,
    passThroughEntryData: null,
    showAlert: false,
    alertMessage: '',
    isMobileView: false,
    CONSTANTS: { ADMIN_CODE: '9999' },
    onClearCourtClick: vi.fn(),
    ...overrides,
  };
}

/**
 * Minimal app shape for HomeRoute (must satisfy both presenters and route overlay).
 */
function makeRouteApp(overrides = {}) {
  return {
    search: {
      searchInput: '',
      showSuggestions: false,
      isSearching: false,
      effectiveSearchInput: '',
      getAutocompleteSuggestions: () => [],
      setSearchInput: noop,
      setShowSuggestions: noop,
    },
    derived: {
      canFirstGroupPlay: false,
      canSecondGroupPlay: false,
      firstWaitlistEntry: null,
      secondWaitlistEntry: null,
      firstWaitlistEntryData: null,
      secondWaitlistEntryData: null,
      canPassThroughGroupPlay: false,
      passThroughEntry: null,
      passThroughEntryData: null,
      isMobileView: false,
    },
    alert: { showAlert: false, alertMessage: '' },
    setters: {
      setCurrentScreen: noop,
      setHasWaitlistPriority: noop,
      setCurrentWaitlistEntryId: noop,
    },
    players: {
      memberIdentity: { setMemberNumber: noop },
      groupGuest: { setCurrentGroup: noop },
    },
    mobile: { checkingLocation: false },
    CONSTANTS: { ADMIN_CODE: '9999' },
    TENNIS_CONFIG: { GEOLOCATION: { CHECKING_MESSAGE: 'Checking your location…' } },
    ...overrides,
  };
}

function makeRouteHandlers() {
  return {
    handleSuggestionClick: noop,
    markUserTyping: noop,
    findMemberNumber: () => '',
    checkLocationAndProceed: noop,
  };
}

// ---------------------------------------------------------------------------
// A) HomeScreen rendering branches
// ---------------------------------------------------------------------------

describe('HomeScreen rendering', () => {
  it('hides all CTAs by default', () => {
    render(<HomeScreen {...makeHomeProps()} />);
    expect(screen.queryByTestId('waitlist-cta-1')).not.toBeInTheDocument();
    // No CTA buttons with "Court Available" text
    expect(screen.queryByText(/Court Available/)).not.toBeInTheDocument();
  });

  it('shows CTA #1 when canFirstGroupPlay', () => {
    const props = makeHomeProps({
      canFirstGroupPlay: true,
      firstWaitlistEntry: {
        id: 'w1',
        players: [{ memberId: 'm1', name: 'Alice' }],
      },
      firstWaitlistEntryData: {
        players: [{ displayName: 'Alice' }],
      },
    });
    render(<HomeScreen {...props} />);
    expect(screen.getByTestId('waitlist-cta-1')).toBeInTheDocument();
    expect(screen.getByText('Court Available: Alice')).toBeInTheDocument();
  });

  it('shows CTA #2 when canSecondGroupPlay', () => {
    const props = makeHomeProps({
      canSecondGroupPlay: true,
      secondWaitlistEntry: {
        id: 'w2',
        players: [{ memberId: 'm2', name: 'Bob' }],
      },
      secondWaitlistEntryData: {
        players: [{ displayName: 'Bob' }],
      },
    });
    render(<HomeScreen {...props} />);
    expect(screen.getByText('Court Available: Bob')).toBeInTheDocument();
  });

  it('shows pass-through CTA when canPassThroughGroupPlay', () => {
    const props = makeHomeProps({
      canPassThroughGroupPlay: true,
      passThroughEntry: {
        id: 'w3',
        players: [{ memberId: 'm3', name: 'Carol' }],
      },
      passThroughEntryData: {
        players: [{ displayName: 'Carol' }],
      },
    });
    render(<HomeScreen {...props} />);
    expect(screen.getByText('Court Available: Carol')).toBeInTheDocument();
  });

  it('renders clear court button', () => {
    render(<HomeScreen {...makeHomeProps()} />);
    expect(screen.getByTestId('clear-court-btn')).toBeInTheDocument();
    expect(screen.getByText('Clear a court')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) HomeRoute overlay tests
// ---------------------------------------------------------------------------

describe('HomeRoute overlay', () => {
  it('shows location overlay when checkingLocation = true', () => {
    const app = makeRouteApp({
      mobile: { checkingLocation: true },
    });
    render(<HomeRoute app={app} handlers={makeRouteHandlers()} />);
    expect(screen.getByText('Checking your location…')).toBeInTheDocument();
  });

  it('renders without overlay when checkingLocation = false', () => {
    const app = makeRouteApp({
      mobile: { checkingLocation: false },
    });
    render(<HomeRoute app={app} handlers={makeRouteHandlers()} />);
    expect(screen.queryByText('Checking your location…')).not.toBeInTheDocument();
    // HomeScreen still renders
    expect(screen.getByText('Tennis Court Registration')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C) HomeScreen interaction tests
// ---------------------------------------------------------------------------

describe('HomeScreen interactions', () => {
  it('entering ADMIN_CODE triggers admin navigation', () => {
    const setCurrentScreen = vi.fn();
    const setSearchInput = vi.fn();
    const markUserTyping = vi.fn();
    const props = makeHomeProps({ setCurrentScreen, setSearchInput, markUserTyping });
    render(<HomeScreen {...props} />);

    const input = screen.getByPlaceholderText('Enter your member number or name');
    fireEvent.change(input, { target: { value: '9999' } });

    expect(markUserTyping).toHaveBeenCalled();
    expect(setCurrentScreen).toHaveBeenCalledWith('admin');
    // Input is cleared after admin code detection
    expect(setSearchInput).toHaveBeenCalledWith('');
  });

  it('CTA #1 click sets group, member, priority, and navigates to court', () => {
    const setCurrentGroup = vi.fn();
    const setMemberNumber = vi.fn();
    const setHasWaitlistPriority = vi.fn();
    const setCurrentWaitlistEntryId = vi.fn();
    const setCurrentScreen = vi.fn();
    const findMemberNumber = vi.fn(() => '1001');

    const props = makeHomeProps({
      canFirstGroupPlay: true,
      firstWaitlistEntry: {
        id: 'w1',
        players: [{ memberId: 'm1', name: 'Alice' }],
      },
      firstWaitlistEntryData: {
        players: [{ displayName: 'Alice' }],
      },
      setCurrentGroup,
      setMemberNumber,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setCurrentScreen,
      findMemberNumber,
    });
    render(<HomeScreen {...props} />);

    fireEvent.click(screen.getByTestId('waitlist-cta-1'));

    // findMemberNumber called with the player's memberId
    expect(findMemberNumber).toHaveBeenCalledWith('m1');
    // Group set with mapped players including resolved memberNumber
    expect(setCurrentGroup).toHaveBeenCalledWith([
      { memberId: 'm1', name: 'Alice', memberNumber: '1001' },
    ]);
    // First player's member number set
    expect(setMemberNumber).toHaveBeenCalledWith('1001');
    // Waitlist priority enabled
    expect(setHasWaitlistPriority).toHaveBeenCalledWith(true);
    // Waitlist entry ID stored
    expect(setCurrentWaitlistEntryId).toHaveBeenCalledWith('w1');
    // Navigates to court selection
    expect(setCurrentScreen).toHaveBeenCalledWith('court');
  });

  it('CTA #2 click sets second group, member, priority, and navigates to court', () => {
    const setCurrentGroup = vi.fn();
    const setMemberNumber = vi.fn();
    const setHasWaitlistPriority = vi.fn();
    const setCurrentWaitlistEntryId = vi.fn();
    const setCurrentScreen = vi.fn();
    const findMemberNumber = vi.fn(() => '2002');

    const props = makeHomeProps({
      canSecondGroupPlay: true,
      secondWaitlistEntry: {
        id: 'w2',
        players: [{ memberId: 'm2', name: 'Bob' }],
      },
      secondWaitlistEntryData: {
        players: [{ displayName: 'Bob' }],
      },
      setCurrentGroup,
      setMemberNumber,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setCurrentScreen,
      findMemberNumber,
    });
    render(<HomeScreen {...props} />);

    fireEvent.click(screen.getByText('Court Available: Bob'));

    expect(findMemberNumber).toHaveBeenCalledWith('m2');
    expect(setCurrentGroup).toHaveBeenCalledWith([
      { memberId: 'm2', name: 'Bob', memberNumber: '2002' },
    ]);
    expect(setMemberNumber).toHaveBeenCalledWith('2002');
    expect(setHasWaitlistPriority).toHaveBeenCalledWith(true);
    expect(setCurrentWaitlistEntryId).toHaveBeenCalledWith('w2');
    expect(setCurrentScreen).toHaveBeenCalledWith('court');
  });

  it('pass-through CTA click sets group, member, priority, and navigates to court', () => {
    const setCurrentGroup = vi.fn();
    const setMemberNumber = vi.fn();
    const setHasWaitlistPriority = vi.fn();
    const setCurrentWaitlistEntryId = vi.fn();
    const setCurrentScreen = vi.fn();
    const findMemberNumber = vi.fn(() => '3003');

    const props = makeHomeProps({
      canPassThroughGroupPlay: true,
      passThroughEntry: {
        id: 'w3',
        players: [{ memberId: 'm3', name: 'Carol' }],
      },
      passThroughEntryData: {
        players: [{ displayName: 'Carol' }],
      },
      setCurrentGroup,
      setMemberNumber,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setCurrentScreen,
      findMemberNumber,
    });
    render(<HomeScreen {...props} />);

    fireEvent.click(screen.getByText('Court Available: Carol'));

    expect(findMemberNumber).toHaveBeenCalledWith('m3');
    expect(setCurrentGroup).toHaveBeenCalledWith([
      { memberId: 'm3', name: 'Carol', memberNumber: '3003' },
    ]);
    expect(setMemberNumber).toHaveBeenCalledWith('3003');
    expect(setHasWaitlistPriority).toHaveBeenCalledWith(true);
    expect(setCurrentWaitlistEntryId).toHaveBeenCalledWith('w3');
    expect(setCurrentScreen).toHaveBeenCalledWith('court');
  });
});
