/**
 * Registration screen smoke tests — renders + key elements + critical callbacks.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component imports
// ---------------------------------------------------------------------------

// @lib uses a Vite alias; mock the barrel so CourtSelectionScreen resolves
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

// ClearCourtScreen uses storage + logger
vi.mock('../../src/lib/storage.js', () => ({
  readDataSafe: vi.fn(() => ({ courts: [] })),
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// toast util used by HomeScreen
vi.mock('../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
}));

// TypedIcon used by ClearCourtScreen
vi.mock('../../src/components/icons/TypedIcon', () => ({
  TypedIcon: (props) => <span data-testid="typed-icon">{props.icon}</span>,
}));

// SuccessScreen sub-components
vi.mock('../../src/registration/screens/success/useBallPurchase.js', () => ({
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
import GroupScreen from '../../../src/registration/screens/GroupScreen.jsx';
import CourtSelectionScreen from '../../../src/registration/screens/CourtSelectionScreen.jsx';
import SuccessScreen from '../../../src/registration/screens/SuccessScreen.jsx';
import ClearCourtScreen from '../../../src/registration/screens/ClearCourtScreen.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const noop = () => {};
const noopFn = vi.fn();

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

function makeGroupProps(overrides = {}) {
  const courtSelectionStub = {
    getSelectableForGroup: () => [],
  };
  return {
    data: { courtSelection: courtSelectionStub, waitlist: [] },
    currentGroup: [{ name: 'Alice', memberNumber: '1001' }],
    memberNumber: '1001',
    availableCourts: [1, 2, 3],
    courtSelection: courtSelectionStub,
    frequentPartners: [],
    frequentPartnersLoading: false,
    showAlert: false,
    alertMessage: '',
    showTimeoutWarning: false,
    isMobileView: false,
    searchInput: '',
    showSuggestions: false,
    effectiveSearchInput: '',
    _showAddPlayer: true,
    addPlayerSearch: '',
    showAddPlayerSuggestions: false,
    effectiveAddPlayerSearch: '',
    showGuestForm: false,
    guestName: '',
    guestSponsor: '',
    showGuestNameError: false,
    showSponsorError: false,
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
    onSelectCourt: vi.fn(),
    isAssigning: false,
    onJoinWaitlist: noop,
    joiningWaitlist: false,
    onGoBack: vi.fn(),
    onStartOver: noop,
    getAutocompleteSuggestions: () => [],
    isPlayerAlreadyPlaying: () => ({ isPlaying: false }),
    sameGroup: () => false,
    CONSTANTS: { MAX_PLAYERS: 4, MAX_FREQUENT_PARTNERS: 5 },
    ...overrides,
  };
}

function makeCourtProps(overrides = {}) {
  return {
    availableCourts: [1, 3, 5],
    showingOvertimeCourts: false,
    onCourtSelect: vi.fn(),
    onGoBack: vi.fn(),
    onStartOver: vi.fn(),
    currentGroup: [{ name: 'Alice' }, { name: 'Bob' }],
    isMobileView: false,
    upcomingBlocks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A) HomeScreen
// ---------------------------------------------------------------------------
describe('HomeScreen', () => {
  it('renders search input and header text', () => {
    render(<HomeScreen {...makeHomeProps()} />);
    expect(screen.getByPlaceholderText('Enter your member number or name')).toBeInTheDocument();
    expect(screen.getByText('Tennis Court Registration')).toBeInTheDocument();
  });

  it('renders Clear a court button and fires callback', () => {
    const onClearCourtClick = vi.fn();
    render(<HomeScreen {...makeHomeProps({ onClearCourtClick })} />);
    const btn = screen.getByText('Clear a court');
    fireEvent.click(btn);
    expect(onClearCourtClick).toHaveBeenCalledOnce();
  });

  it('shows waitlist CTA when canFirstGroupPlay is true', () => {
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
    expect(screen.getByText('Court Available: Alice')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) GroupScreen
// ---------------------------------------------------------------------------
describe('GroupScreen', () => {
  it('renders with one player and shows welcome message', () => {
    render(<GroupScreen {...makeGroupProps()} />);
    expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Add Another Player" section', () => {
    render(<GroupScreen {...makeGroupProps()} />);
    expect(screen.getByText('Add Another Player')).toBeInTheDocument();
  });

  it('shows "+ Guest" button', () => {
    render(<GroupScreen {...makeGroupProps()} />);
    expect(screen.getByText('+ Guest')).toBeInTheDocument();
  });

  it('fires onGoBack when Go Back is clicked', () => {
    const onGoBack = vi.fn();
    render(<GroupScreen {...makeGroupProps({ onGoBack })} />);
    fireEvent.click(screen.getByText('Go Back'));
    expect(onGoBack).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// C) CourtSelectionScreen
// ---------------------------------------------------------------------------
describe('CourtSelectionScreen', () => {
  it('renders court buttons for each available court', () => {
    render(<CourtSelectionScreen {...makeCourtProps()} />);
    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();
    expect(screen.getByText('Court 5')).toBeInTheDocument();
  });

  it('shows "Select Your Court" heading', () => {
    render(<CourtSelectionScreen {...makeCourtProps()} />);
    expect(screen.getByText('Select Your Court')).toBeInTheDocument();
  });

  it('fires onCourtSelect when a court is clicked', () => {
    const onCourtSelect = vi.fn();
    render(<CourtSelectionScreen {...makeCourtProps({ onCourtSelect })} />);
    fireEvent.click(screen.getByText('Court 3'));
    expect(onCourtSelect).toHaveBeenCalledWith(3);
  });

  it('fires onGoBack when Go Back is clicked', () => {
    const onGoBack = vi.fn();
    render(<CourtSelectionScreen {...makeCourtProps({ onGoBack })} />);
    fireEvent.click(screen.getByText('Go Back'));
    expect(onGoBack).toHaveBeenCalledOnce();
  });

  it('shows overtime warning when showingOvertimeCourts is true', () => {
    render(<CourtSelectionScreen {...makeCourtProps({ showingOvertimeCourts: true })} />);
    expect(screen.getByText(/overtime court/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D) SuccessScreen — waitlist path (simplest; avoids deep sub-component tree)
// ---------------------------------------------------------------------------
describe('SuccessScreen (waitlist)', () => {
  it('renders waitlist success with position', () => {
    render(
      <SuccessScreen
        isCourtAssignment={false}
        justAssignedCourt={null}
        assignedCourt={null}
        sessionId={null}
        assignedEndTime={null}
        replacedGroup={null}
        canChangeCourt={false}
        changeTimeRemaining={0}
        position={3}
        estimatedWait={15}
        onChangeCourt={noop}
        onHome={vi.fn()}
        currentGroup={[{ name: 'Alice', memberNumber: '1001' }]}
        isMobile={false}
        ballPriceCents={500}
        onPurchaseBalls={noop}
        onLookupMemberAccount={noop}
        TENNIS_CONFIG={{ PRICING: { TENNIS_BALLS: 5 } }}
        getCourtBlockStatus={() => null}
        upcomingBlocks={[]}
        onUpdateSessionTournament={noop}
      />
    );
    expect(screen.getByText(/2 groups/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// E) ClearCourtScreen — step 1 (court selection)
// ---------------------------------------------------------------------------
describe('ClearCourtScreen', () => {
  it('renders step 1 with clearable courts', () => {
    render(
      <ClearCourtScreen
        clearCourtStep={1}
        setClearCourtStep={vi.fn()}
        selectedCourtToClear={null}
        setSelectedCourtToClear={vi.fn()}
        clearCourt={vi.fn()}
        resetForm={vi.fn()}
        showAlert={false}
        alertMessage=""
        getCourtsOccupiedForClearing={() => [2, 4]}
        courtData={{ courts: [] }}
        CONSTANTS={{ AUTO_RESET_CLEAR_MS: 2000 }}
        TennisBusinessLogic={{ formatPlayerDisplayName: (n) => n }}
      />
    );
    expect(screen.getByText('Choose a court to clear')).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(screen.getByText('Court 4')).toBeInTheDocument();
  });

  it('shows empty message when no courts occupied (after delay)', () => {
    vi.useFakeTimers();
    render(
      <ClearCourtScreen
        clearCourtStep={1}
        setClearCourtStep={vi.fn()}
        selectedCourtToClear={null}
        setSelectedCourtToClear={vi.fn()}
        clearCourt={vi.fn()}
        resetForm={vi.fn()}
        showAlert={false}
        alertMessage=""
        getCourtsOccupiedForClearing={() => []}
        courtData={{ courts: [] }}
        CONSTANTS={{ AUTO_RESET_CLEAR_MS: 2000 }}
        TennisBusinessLogic={{ formatPlayerDisplayName: (n) => n }}
      />
    );
    // Initially shows "Checking courts…" during grace period
    expect(screen.getByText(/Checking courts/)).toBeInTheDocument();
    // After delay, confirms empty state
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText(/No courts are currently in use/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
