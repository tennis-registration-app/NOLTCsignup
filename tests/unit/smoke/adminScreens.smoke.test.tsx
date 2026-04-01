/**
 * Admin UI section smoke tests — renders + key elements + critical callbacks.
 *
 * Strategy: test individual section/leaf components that accept props.
 * Full AdminPanel (App.jsx) is too deeply wired for smoke-level testing.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Icons barrel — used by TabNavigation, CourtCard, WaitlistSection
vi.mock('../../../src/shared/ui/icons/Icons.jsx', () => {
  const stub = (name: any) => {
    const Icon = ({ size, className }) => (
      <span data-testid={`icon-${name}`} className={className}>
        {name}
      </span>
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    Calendar: stub('Calendar'),
    CalendarDays: stub('CalendarDays'),
    Settings: stub('Settings'),
    ChevronLeft: stub('ChevronLeft'),
    ChevronRight: stub('ChevronRight'),
    Grid: stub('Grid'),
    BarChart: stub('BarChart'),
    FileText: stub('FileText'),
    Trash2: stub('Trash2'),
    Edit2: stub('Edit2'),
    X: stub('X'),
    RefreshCw: stub('RefreshCw'),
    greyFilter: {},
  };
});

// courtStatusUtils — used by CourtCard (resolve from project root)
vi.mock('../../../src/admin/courts/courtStatusUtils.js', () => ({
  getStatusColor: (status: any) =>
    status === 'available' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50',
  formatTimeRemaining: () => '45 min left',
  getPlayerNames: (players: any) =>
    (players || []).map((p: any) => (typeof p === 'string' ? p : p.name)).join(', '),
}));

// formatters — used transitively by courtStatusUtils
vi.mock('../../../src/lib/formatters.js', () => ({
  formatTimeRemaining: () => '45 min left',
}));

// ---------------------------------------------------------------------------
// Component imports (after mocks)
// ---------------------------------------------------------------------------
import { TabNavigation } from '../../../src/admin/tabs/TabNavigation.jsx';
import CourtCard from '../../../src/admin/courts/CourtCard.jsx';
import CourtSelectionGrid from '../../../src/admin/blocks/CourtSelectionGrid.jsx';
import { WaitlistSection } from '../../../src/admin/tabs/WaitlistSection.jsx';

// ---------------------------------------------------------------------------
// A) TabNavigation
// ---------------------------------------------------------------------------
describe('TabNavigation', () => {
  function renderTabs(overrides = {}) {
    const props = {
      activeTab: 'status',
      setActiveTab: vi.fn(),
      blockingView: 'create',
      setBlockingView: vi.fn(),
      onExit: vi.fn(),
      ...overrides,
    };
    render(<TabNavigation {...props} />);
    return props;
  }

  it('renders all 6 tab labels', () => {
    renderTabs();
    expect(screen.getByText('Court Status')).toBeInTheDocument();
    expect(screen.getByText('Event Calendar')).toBeInTheDocument();
    expect(screen.getByText('Court Blocking')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Game History')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders Exit Admin button and fires onExit', () => {
    const props = renderTabs();
    const btn = screen.getByText('Exit Admin');
    fireEvent.click(btn);
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it('fires setActiveTab when a tab is clicked', () => {
    const props = renderTabs();
    fireEvent.click(screen.getByText('Analytics'));
    expect(props.setActiveTab).toHaveBeenCalledWith('analytics');
  });

  it('shows blocking sub-tabs when blocking tab is active', () => {
    renderTabs({ activeTab: 'blocking' });
    expect(screen.getByText('Create Blocks')).toBeInTheDocument();
    expect(screen.getByText('Blocked Time')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) CourtCard
// ---------------------------------------------------------------------------
describe('CourtCard', () => {
  const defaultHandlers = {
    onToggleActions: vi.fn(),
    onWetToggle: vi.fn(),
    onMoveTarget: vi.fn(),
    onEditClick: vi.fn(),
    onClearCourt: vi.fn(),
    onInitiateMove: vi.fn(),
  };

  it('renders available court with number', () => {
    render(
      <CourtCard
        courtNum={3}
        status="available"
        info={null}
        currentTime={new Date()}
        movingFrom={null}
        showActionsMenu={false}
        handlers={defaultHandlers}
      />
    );
    expect(screen.getByText('Court 3')).toBeInTheDocument();
  });

  it('renders occupied court with player names', () => {
    render(
      <CourtCard
        courtNum={5}
        status="occupied"
        info={{
          players: [{ name: 'Alice' }, { name: 'Bob' }],
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        }}
        currentTime={new Date()}
        movingFrom={null}
        showActionsMenu={false}
        handlers={defaultHandlers}
      />
    );
    expect(screen.getByText('Court 5')).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });

  it('renders wet court indicator', () => {
    render(
      <CourtCard
        courtNum={7}
        status="wet"
        info={{ type: 'wet' }}
        currentTime={new Date()}
        movingFrom={null}
        showActionsMenu={false}
        handlers={defaultHandlers}
      />
    );
    expect(screen.getByText(/WET COURT/)).toBeInTheDocument();
  });

  it('shows actions menu when showActionsMenu is true', () => {
    render(
      <CourtCard
        courtNum={2}
        status="occupied"
        info={{
          players: [{ name: 'Charlie' }],
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        }}
        currentTime={new Date()}
        movingFrom={null}
        showActionsMenu={true}
        handlers={defaultHandlers}
      />
    );
    expect(screen.getByText('Clear Court')).toBeInTheDocument();
    expect(screen.getByText('Move Players')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C) CourtSelectionGrid
// ---------------------------------------------------------------------------
describe('CourtSelectionGrid', () => {
  it('renders 12 court buttons', () => {
    render(
      <CourtSelectionGrid
        selectedCourts={[]}
        onToggleCourt={vi.fn()}
        editingBlock={null}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.getByText('Select Courts to Block')).toBeInTheDocument();
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(`Court ${i}`)).toBeInTheDocument();
    }
  });

  it('fires onToggleCourt when a court is clicked', () => {
    const onToggleCourt = vi.fn();
    render(
      <CourtSelectionGrid
        selectedCourts={[]}
        onToggleCourt={onToggleCourt}
        editingBlock={null}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Court 4'));
    expect(onToggleCourt).toHaveBeenCalledWith(4);
  });

  it('shows Select All and Clear Selection buttons', () => {
    render(
      <CourtSelectionGrid
        selectedCourts={[]}
        onToggleCourt={vi.fn()}
        editingBlock={null}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D) WaitlistSection
// ---------------------------------------------------------------------------
describe('WaitlistSection', () => {
  it('renders empty waitlist message', () => {
    render(
      <WaitlistSection
        waitlistModel={{ waitingGroups: [] }}
        waitlistActions={{ moveInWaitlist: vi.fn(), removeFromWaitlist: vi.fn() }}
      />
    );
    expect(screen.getByText('Waiting Groups (0)')).toBeInTheDocument();
    expect(screen.getByText('No groups waiting')).toBeInTheDocument();
  });

  it('renders waitlist entries with player names', () => {
    const groups = [
      { names: ['Alice', 'Bob'] },
      { names: ['Charlie'] },
    ];
    render(
      <WaitlistSection
        waitlistModel={{ waitingGroups: groups }}
        waitlistActions={{ moveInWaitlist: vi.fn(), removeFromWaitlist: vi.fn() }}
      />
    );
    expect(screen.getByText('Waiting Groups (2)')).toBeInTheDocument();
    expect(screen.getByText('Position 1: Alice, Bob')).toBeInTheDocument();
    expect(screen.getByText('Position 2: Charlie')).toBeInTheDocument();
  });

  it('fires removeFromWaitlist when remove button is clicked', () => {
    const removeFromWaitlist = vi.fn();
    render(
      <WaitlistSection
        waitlistModel={{ waitingGroups: [{ names: ['Alice'] }] }}
        waitlistActions={{ moveInWaitlist: vi.fn(), removeFromWaitlist }}
      />
    );
    // The Trash2 icon button is the remove action
    const removeBtn = screen.getByTestId('icon-Trash2').closest('button');
    fireEvent.click(removeBtn!);
    expect(removeFromWaitlist).toHaveBeenCalledWith(0);
  });
});
