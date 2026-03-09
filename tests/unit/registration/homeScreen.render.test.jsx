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
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component imports
// ---------------------------------------------------------------------------

// toast util used by HomeScreen
vi.mock('../../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
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

const noop = () => {};

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
