/**
 * GroupRoute streak modal rendering tests
 *
 * Tests the streak modal branch owned by GroupRoute.
 * GroupScreen is stubbed out — tested separately in groupScreen.render.test.jsx.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — must come before component imports
// ---------------------------------------------------------------------------

// Stub GroupScreen (imported via screens barrel) — route-level test only
vi.mock('../../../src/registration/screens/index.js', () => ({
  GroupScreen: () => <div data-testid="group-screen-stub" />,
}));

// Stub presenters to return empty objects (GroupScreen is stubbed anyway)
vi.mock('../../../src/registration/router/presenters/index.ts', () => ({
  buildGroupModel: () => ({}),
  buildGroupActions: () => ({}),
}));

// Mock WorkflowContext — GroupRoute now reads streak from useWorkflowContext()
// The mock returns a ref that tests can update per-test via mockWorkflow.
const noop = () => {};

const defaultWorkflow = {
  streak: {
    registrantStreak: 0,
    showStreakModal: false,
    streakAcknowledged: false,
    setStreakAcknowledged: noop,
  },
};

let mockWorkflow = { ...defaultWorkflow };

vi.mock('../../../src/registration/context/WorkflowProvider', () => ({
  useWorkflowContext: () => mockWorkflow,
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import { GroupRoute } from '../../../src/registration/router/routes/GroupRoute.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRouteApp(overrides = {}) {
  return {
    // Minimum shape for presenters (stubbed, but destructuring still runs)
    state: {},
    players: { groupGuest: {}, memberIdentity: {} },
    derived: {},
    alert: {},
    session: { timeout: {} },
    mobile: {},
    search: {},
    CONSTANTS: {},
    ...overrides,
  };
}

function makeRouteHandlers(overrides = {}) {
  return {
    handleStreakAcknowledge: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupRoute streak modal', () => {
  it('does not render streak modal when showStreakModal = false', () => {
    mockWorkflow = { ...defaultWorkflow };
    const app = makeRouteApp();
    render(<GroupRoute app={app} handlers={makeRouteHandlers()} />);
    expect(screen.getByTestId('group-screen-stub')).toBeInTheDocument();
    expect(screen.queryByText('Clear Court Reminder')).not.toBeInTheDocument();
  });

  it('renders streak modal with content when showStreakModal = true', () => {
    mockWorkflow = {
      ...defaultWorkflow,
      streak: {
        registrantStreak: 5,
        showStreakModal: true,
        streakAcknowledged: false,
        setStreakAcknowledged: noop,
      },
    };
    const app = makeRouteApp();
    render(<GroupRoute app={app} handlers={makeRouteHandlers()} />);
    expect(screen.getByText('Clear Court Reminder')).toBeInTheDocument();
    expect(
      screen.getByText(/Your last 5 sessions were ended without using/)
    ).toBeInTheDocument();
    expect(screen.getByText('Got it')).toBeInTheDocument();
    expect(screen.getByText('Return to Select Your Court')).toBeInTheDocument();
  });

  it('continue button is disabled when streakAcknowledged = false', () => {
    mockWorkflow = {
      ...defaultWorkflow,
      streak: {
        registrantStreak: 3,
        showStreakModal: true,
        streakAcknowledged: false,
        setStreakAcknowledged: noop,
      },
    };
    const app = makeRouteApp();
    render(<GroupRoute app={app} handlers={makeRouteHandlers()} />);
    const button = screen.getByText('Return to Select Your Court');
    expect(button).toBeDisabled();
  });

  it('continue button is enabled when streakAcknowledged = true', () => {
    mockWorkflow = {
      ...defaultWorkflow,
      streak: {
        registrantStreak: 3,
        showStreakModal: true,
        streakAcknowledged: true,
        setStreakAcknowledged: noop,
      },
    };
    const app = makeRouteApp();
    render(<GroupRoute app={app} handlers={makeRouteHandlers()} />);
    const button = screen.getByText('Return to Select Your Court');
    expect(button).not.toBeDisabled();
  });
});
