/**
 * Courtboard UI smoke tests — renders + key elements.
 *
 * Strategy: test leaf/presentational components with minimal mocks.
 * Full TennisCourtDisplay and main App require window.Tennis platform
 * bridge — tested via E2E instead.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// @lib barrel (used by CourtCard for getUpcomingBlockWarningFromBlocks)
vi.mock('@lib', () => ({
  getUpcomingBlockWarningFromBlocks: vi.fn(() => null),
}));

// courtUtils (used by CourtCard)
vi.mock('../../../src/courtboard/utils/courtUtils.js', () => ({
  classForStatus: () => 'border-green-500 bg-green-600',
  namesFor: (cObj) => {
    const players = cObj?.session?.group?.players;
    if (!players) return '';
    return players.map((p) => p.name || p.displayName || '').join(', ');
  },
  formatTime: (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  computeClock: () => ({ primary: 'Available', secondary: '' }),
}));

// windowBridge (used by CourtCard + WaitingList)
vi.mock('../../../src/platform/windowBridge.js', () => ({
  getTennisUI: () => null,
  getMobileModal: () => null,
  getMobileTapToRegister: () => null,
  getTennisDomain: () => ({
    Waitlist: {
      simulateWaitlistEstimates: ({ waitlist }) => waitlist.map((_, i) => (i + 1) * 15),
    },
  }),
  getTennisNamespaceConfig: () => ({ Timing: { AVG_GAME: 75 } }),
  getLegacyAvailabilityDomain: () => null,
}));

// courtAvailability (used by CourtCard for overtime tap logic)
vi.mock('../../../src/shared/courts/courtAvailability.js', () => ({
  listPlayableCourts: () => [],
}));

// shared icons (used transitively by courtboard Icons)
vi.mock('../../../src/shared/ui/icons/Icons.jsx', () => {
  const stub = (name) => {
    const Icon = ({ size, className }) => (
      <span data-testid={`icon-${name}`} className={className}>
        {name}
      </span>
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    Users: stub('Users'),
    Calendar: stub('Calendar'),
    AlertCircle: stub('AlertCircle'),
    TennisBall: stub('TennisBall'),
  };
});

// ---------------------------------------------------------------------------
// Component imports (after mocks)
// ---------------------------------------------------------------------------
import { CourtCard } from '../../../src/courtboard/components/CourtCard.jsx';
import { WaitingList } from '../../../src/courtboard/components/WaitingList.jsx';
import { ReservedCourtsPanel } from '../../../src/courtboard/components/ReservedCourtsPanel.jsx';
import { LoadingPlaceholder } from '../../../src/courtboard/components/LoadingPlaceholder.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const emptyData = { courts: Array(12).fill(null) };
const emptyStatusByCourt = {};
const emptyStatusObjectByCourt = {};

// ---------------------------------------------------------------------------
// A) CourtCard
// ---------------------------------------------------------------------------
describe('CourtCard', () => {
  it('renders a free court with number and "Available"', () => {
    render(
      <CourtCard
        courtNumber={3}
        currentTime={new Date()}
        statusByCourt={{ 3: 'free' }}
        selectableByCourt={{}}
        statusObjectByCourt={{}}
        data={emptyData}
        isMobileView={false}
      />
    );
    expect(screen.getByText('Court 3')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders an occupied court with player names', () => {
    const data = {
      courts: [
        null, null, null, null,
        {
          session: {
            group: { players: [{ name: 'Alice' }, { name: 'Bob' }] },
            scheduledEndAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
        null, null, null, null, null, null, null,
      ],
    };
    render(
      <CourtCard
        courtNumber={5}
        currentTime={new Date()}
        statusByCourt={{ 5: 'occupied' }}
        selectableByCourt={{}}
        statusObjectByCourt={{ 5: {} }}
        data={data as any}
        isMobileView={false}
      />
    );
    expect(screen.getByText('Court 5')).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });

  it('renders a wet court with WET COURT label', () => {
    render(
      <CourtCard
        courtNumber={7}
        currentTime={new Date()}
        statusByCourt={{ 7: 'wet' }}
        selectableByCourt={{}}
        statusObjectByCourt={{ 7: {} }}
        data={emptyData}
        isMobileView={false}
      />
    );
    expect(screen.getByText('Court 7')).toBeInTheDocument();
    expect(screen.getByText('WET COURT')).toBeInTheDocument();
  });

  it('renders a blocked court with reason', () => {
    render(
      <CourtCard
        courtNumber={2}
        currentTime={new Date()}
        statusByCourt={{ 2: 'blocked' }}
        selectableByCourt={{}}
        statusObjectByCourt={{ 2: { reason: 'Lesson', blockedEnd: new Date(Date.now() + 3600000).toISOString() } }}
        data={emptyData}
        isMobileView={false}
      />
    );
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
  });

  it('shows "Tap to Select" in mobile view for free court', () => {
    render(
      <CourtCard
        courtNumber={1}
        currentTime={new Date()}
        statusByCourt={{ 1: 'free' }}
        selectableByCourt={{}}
        statusObjectByCourt={{}}
        data={emptyData}
        isMobileView={true}
      />
    );
    expect(screen.getByText('Tap to Select')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B) WaitingList
// ---------------------------------------------------------------------------
describe('WaitingList', () => {
  it('renders empty waitlist message', () => {
    render(
      <WaitingList
        waitlist={[]}
        courts={[]}
        currentTime={new Date()}
        maxWaitingDisplay={10}
      />
    );
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('No groups waiting')).toBeInTheDocument();
  });

  it('renders waitlist entries with player last names', () => {
    const waitlist = [
      { names: ['Alice Smith', 'Bob Jones'], players: [{ id: '1' }, { id: '2' }] },
      { names: ['Charlie Brown'], players: [{ id: '3' }] },
    ];
    render(
      <WaitingList
        waitlist={waitlist}
        courts={[]}
        currentTime={new Date()}
        maxWaitingDisplay={10}
      />
    );
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    // WaitingList formats last names: "Smith / Jones"
    expect(screen.getByText('Smith / Jones')).toBeInTheDocument();
    expect(screen.getByText('Brown')).toBeInTheDocument();
  });

  it('shows estimated wait times', () => {
    const waitlist = [
      { names: ['Alice Smith'], players: [{ id: '1' }] },
    ];
    render(
      <WaitingList
        waitlist={waitlist}
        courts={[]}
        currentTime={new Date()}
        maxWaitingDisplay={10}
      />
    );
    // Mock returns (idx+1)*15 = 15 for position 0
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C) ReservedCourtsPanel
// ---------------------------------------------------------------------------
describe('ReservedCourtsPanel', () => {
  it('renders empty state', () => {
    render(<ReservedCourtsPanel items={[]} className="test" />);
    expect(screen.getByText('Reserved Courts')).toBeInTheDocument();
    expect(screen.getByText('No scheduled blocks today')).toBeInTheDocument();
  });

  it('renders reserved items with court numbers and labels', () => {
    const now = new Date();
    const items = [
      {
        key: 'lesson-1',
        courts: [1, 2],
        start: new Date(now.getTime() + 3600000),
        end: new Date(now.getTime() + 7200000),
        label: 'LESSON',
        warning: false,
      },
    ];
    render(<ReservedCourtsPanel items={items} className="test" />);
    expect(screen.getByText('Reserved Courts')).toBeInTheDocument();
    expect(screen.getByText('1, 2')).toBeInTheDocument();
  });

  it('accepts custom title', () => {
    render(<ReservedCourtsPanel items={[]} className="test" title="Today's Events" />);
    expect(screen.getByText("Today's Events")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D) LoadingPlaceholder
// ---------------------------------------------------------------------------
describe('LoadingPlaceholder', () => {
  it('renders loading message', () => {
    render(<LoadingPlaceholder />);
    expect(screen.getByText('Loading Court Display...')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Tennis modules')).toBeInTheDocument();
  });
});
