/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock shared icons
vi.mock('../../../../src/shared/ui/icons/Icons.jsx', () => {
  const stub = (name: any) => {
    const Icon = ({ size }) => (
      <span data-testid={`icon-${name}`}>{name}({size})</span>
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    ChevronLeft: stub('ChevronLeft'),
    ChevronRight: stub('ChevronRight'),
    Clock: stub('Clock'),
    Edit2: stub('Edit2'),
    Copy: stub('Copy'),
    Trash2: stub('Trash2'),
  };
});

import BlockTimelineToolbar from '../../../../src/admin/blocks/BlockTimelineToolbar.jsx';
import BlockTimelineCard from '../../../../src/admin/blocks/BlockTimelineCard.jsx';

describe('BlockTimelineToolbar', () => {
  const defaultProps = {
    viewMode: 'day',
    selectedDate: new Date(2025, 5, 18),
    filterCourt: 'all',
    onViewModeChange: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onFilterCourtChange: vi.fn(),
  };

  it('renders Day and Week buttons', () => {
    render(<BlockTimelineToolbar {...defaultProps} />);
    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Week')).toBeTruthy();
  });

  it('renders Today button', () => {
    render(<BlockTimelineToolbar {...defaultProps} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('fires onPrev/onNext/onToday', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();
    render(<BlockTimelineToolbar {...defaultProps} onPrev={onPrev} onNext={onNext} onToday={onToday} />);

    const buttons = screen.getAllByRole('button');
    // buttons: Day, Week, Prev, Today, Next
    fireEvent.click(buttons[2]); // Prev
    expect(onPrev).toHaveBeenCalledOnce();

    fireEvent.click(buttons[4]); // Next
    expect(onNext).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText('Today'));
    expect(onToday).toHaveBeenCalledOnce();
  });

  it('fires onViewModeChange', () => {
    const onViewModeChange = vi.fn();
    render(<BlockTimelineToolbar {...defaultProps} onViewModeChange={onViewModeChange} />);

    fireEvent.click(screen.getByText('Week'));
    expect(onViewModeChange).toHaveBeenCalledWith('week');
  });

  it('renders court filter with All Courts default', () => {
    render(<BlockTimelineToolbar {...defaultProps} />);
    const select = screen.getByDisplayValue('All Courts');
    expect(select).toBeTruthy();
  });

  it('fires onFilterCourtChange when court selected', () => {
    const onFilterCourtChange = vi.fn();
    render(<BlockTimelineToolbar {...defaultProps} onFilterCourtChange={onFilterCourtChange} />);
    const select = screen.getByDisplayValue('All Courts');
    fireEvent.change(select, { target: { value: '3' } });
    expect(onFilterCourtChange).toHaveBeenCalledWith('3');
  });
});

describe('BlockTimelineCard', () => {
  const futureBlock = {
    id: 'b1',
    courtNumber: 5,
    title: 'Junior Clinic',
    reason: 'clinic',
    startTime: '2025-06-18T14:00:00',
    endTime: '2025-06-18T16:00:00',
    isRecurring: false,
  };

  const defaultProps = {
    block: futureBlock,
    status: 'future',
    onEdit: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
  };

  it('renders court number and title', () => {
    render(<BlockTimelineCard {...defaultProps} />);
    expect(screen.getByText('Court 5')).toBeTruthy();
    expect(screen.getByText('Junior Clinic')).toBeTruthy();
  });

  it('shows ACTIVE NOW badge for active status', () => {
    render(<BlockTimelineCard {...defaultProps} status="active" />);
    expect(screen.getByText('ACTIVE NOW')).toBeTruthy();
  });

  it('does not show ACTIVE NOW badge for future status', () => {
    render(<BlockTimelineCard {...defaultProps} status="future" />);
    expect(screen.queryByText('ACTIVE NOW')).toBeNull();
  });

  it('shows Recurring badge when block.isRecurring is true', () => {
    render(<BlockTimelineCard {...defaultProps} block={{ ...futureBlock, isRecurring: true }} />);
    expect(screen.getByText('Recurring')).toBeTruthy();
  });

  it('shows edit/duplicate buttons for future blocks', () => {
    render(<BlockTimelineCard {...defaultProps} status="future" />);
    expect(screen.getByTitle('Edit block')).toBeTruthy();
    expect(screen.getByTitle('Duplicate block')).toBeTruthy();
  });

  it('hides edit/duplicate buttons for past blocks', () => {
    render(<BlockTimelineCard {...defaultProps} status="past" />);
    expect(screen.queryByTitle('Edit block')).toBeNull();
    expect(screen.queryByTitle('Duplicate block')).toBeNull();
  });

  it('always shows remove button', () => {
    render(<BlockTimelineCard {...defaultProps} status="past" />);
    expect(screen.getByTitle('Remove block')).toBeTruthy();
  });

  it('fires onEdit when edit clicked', () => {
    const onEdit = vi.fn();
    render(<BlockTimelineCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByTitle('Edit block'));
    expect(onEdit).toHaveBeenCalledWith(futureBlock);
  });

  it('fires onDuplicate when duplicate clicked', () => {
    const onDuplicate = vi.fn();
    render(<BlockTimelineCard {...defaultProps} onDuplicate={onDuplicate} />);
    fireEvent.click(screen.getByTitle('Duplicate block'));
    expect(onDuplicate).toHaveBeenCalledWith(futureBlock);
  });

  it('fires onRemove when remove clicked', () => {
    const onRemove = vi.fn();
    render(<BlockTimelineCard {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByTitle('Remove block'));
    expect(onRemove).toHaveBeenCalledWith(futureBlock);
  });
});
