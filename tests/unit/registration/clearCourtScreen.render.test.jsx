/**
 * ClearCourtScreen multi-step render branch tests
 *
 * Tests rendering for steps 1–4 and the null fallback.
 * Step 1 court-grid and empty-state are already in smoke tests;
 * here we focus on currently uncovered branches.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component import
// ---------------------------------------------------------------------------

// Components barrel loads QRScanner → transitive deps
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
  TypedIcon: (props) => <span data-testid="typed-icon" />,
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import ClearCourtScreen from '../../../src/registration/screens/ClearCourtScreen.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};

function makeClearCourtProps(overrides = {}) {
  return {
    clearCourtStep: 1,
    setClearCourtStep: vi.fn(),
    selectedCourtToClear: null,
    setSelectedCourtToClear: vi.fn(),
    clearCourt: vi.fn(),
    resetForm: vi.fn(),
    showAlert: false,
    alertMessage: '',
    getCourtsOccupiedForClearing: () => [3],
    courtData: { courts: [] },
    CONSTANTS: { AUTO_RESET_CLEAR_MS: 2000 },
    TennisBusinessLogic: { formatPlayerDisplayName: (n) => n },
    mobileFlow: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClearCourtScreen step 1 mobile/desktop text', () => {
  it('shows "Go Back" on desktop and "Back" on mobile', () => {
    const { unmount } = render(
      <ClearCourtScreen {...makeClearCourtProps({ mobileFlow: false })} />
    );
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    unmount();

    render(<ClearCourtScreen {...makeClearCourtProps({ mobileFlow: true })} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});

describe('ClearCourtScreen step 2', () => {
  it('renders court number and player names from session.group.players', () => {
    const props = makeClearCourtProps({
      clearCourtStep: 2,
      selectedCourtToClear: 3,
      courtData: {
        courts: [
          { number: 3, session: { group: { players: [{ name: 'Alice' }, { name: 'Bob' }] } } },
        ],
      },
    });
    render(<ClearCourtScreen {...props} />);
    expect(screen.getByText('Court 3')).toBeInTheDocument();
    expect(screen.getByText('Alice and Bob')).toBeInTheDocument();
  });

  it('renders player names from fallback court.players path', () => {
    const props = makeClearCourtProps({
      clearCourtStep: 2,
      selectedCourtToClear: 5,
      courtData: {
        courts: [
          { number: 5, players: [{ name: 'Carol' }, { name: 'Dave' }] },
        ],
      },
    });
    render(<ClearCourtScreen {...props} />);
    expect(screen.getByText('Court 5')).toBeInTheDocument();
    expect(screen.getByText('Carol and Dave')).toBeInTheDocument();
  });

  it('shows both clearing method buttons with court number', () => {
    const props = makeClearCourtProps({
      clearCourtStep: 2,
      selectedCourtToClear: 4,
      courtData: {
        courts: [{ number: 4, players: [{ name: 'Eve' }] }],
      },
    });
    render(<ClearCourtScreen {...props} />);
    expect(
      screen.getByText(/We are finished our game and leaving court 4/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Players have finished and court 4 is open/)
    ).toBeInTheDocument();
  });

  it('shows mobile vs desktop text for Back and Exit/Start Over', () => {
    const baseProps = {
      clearCourtStep: 2,
      selectedCourtToClear: 3,
      courtData: { courts: [{ number: 3, players: [] }] },
    };

    // Desktop
    const { unmount } = render(
      <ClearCourtScreen {...makeClearCourtProps({ ...baseProps, mobileFlow: false })} />
    );
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.getByText('Start Over')).toBeInTheDocument();
    unmount();

    // Mobile
    render(
      <ClearCourtScreen {...makeClearCourtProps({ ...baseProps, mobileFlow: true })} />
    );
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
  });
});

describe('ClearCourtScreen step 3 (players leaving)', () => {
  it('renders success screen with "Thanks, have a great day!"', () => {
    const props = makeClearCourtProps({
      clearCourtStep: 3,
      selectedCourtToClear: 6,
    });
    render(<ClearCourtScreen {...props} />);
    expect(screen.getByText('Thanks, have a great day!')).toBeInTheDocument();
    expect(screen.getByText('Court 6 is now available')).toBeInTheDocument();
    expect(screen.getByTestId('typed-icon')).toBeInTheDocument();
  });
});

describe('ClearCourtScreen step 4 (observed empty)', () => {
  it('renders success screen with "Thank you!"', () => {
    const props = makeClearCourtProps({
      clearCourtStep: 4,
      selectedCourtToClear: 2,
    });
    render(<ClearCourtScreen {...props} />);
    expect(screen.getByText('Thank you!')).toBeInTheDocument();
    expect(screen.getByText('Court 2 is now available')).toBeInTheDocument();
    expect(screen.getByTestId('typed-icon')).toBeInTheDocument();
  });
});

describe('ClearCourtScreen fallback', () => {
  it('returns null for unrecognized step', () => {
    const props = makeClearCourtProps({ clearCourtStep: 99 });
    const { container } = render(<ClearCourtScreen {...props} />);
    expect(container.innerHTML).toBe('');
  });
});
