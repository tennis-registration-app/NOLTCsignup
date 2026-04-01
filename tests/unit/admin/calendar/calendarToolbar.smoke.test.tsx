/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock shared icons — CalendarToolbar imports ChevronLeft/ChevronRight via ../components barrel
vi.mock('../../../../src/shared/ui/icons/Icons.jsx', () => {
  const stub = (name: any) => {
    const Icon = ({ size }: any) => (
      <span data-testid={`icon-${name}`}>{name}({size})</span>
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    ChevronLeft: stub('ChevronLeft'),
    ChevronRight: stub('ChevronRight'),
  };
});

import CalendarToolbar from '../../../../src/admin/calendar/CalendarToolbar.jsx';

describe('CalendarToolbar', () => {
  const defaultProps = {
    headerText: 'June 15, 2025',
    viewMode: 'day',
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
  };

  it('renders header text', () => {
    render(<CalendarToolbar {...defaultProps} />);
    expect(screen.getByText('June 15, 2025')).toBeTruthy();
  });

  it('renders Day/Week/Month buttons', () => {
    render(<CalendarToolbar {...defaultProps} />);
    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Week')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
  });

  it('renders Today button', () => {
    render(<CalendarToolbar {...defaultProps} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('fires onPrev when left arrow clicked', () => {
    const onPrev = vi.fn();
    render(<CalendarToolbar {...defaultProps} onPrev={onPrev} />);
    // Left chevron is the first button with the icon
    const buttons = screen.getAllByRole('button');
    // buttons: Day, Week, Month, Prev, Today, Next
    fireEvent.click(buttons[3]); // Prev
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('fires onNext when right arrow clicked', () => {
    const onNext = vi.fn();
    render(<CalendarToolbar {...defaultProps} onNext={onNext} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[5]); // Next
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('fires onToday when Today clicked', () => {
    const onToday = vi.fn();
    render(<CalendarToolbar {...defaultProps} onToday={onToday} />);
    fireEvent.click(screen.getByText('Today'));
    expect(onToday).toHaveBeenCalledOnce();
  });

  it('fires onViewModeChange with correct mode', () => {
    const onViewModeChange = vi.fn();
    render(<CalendarToolbar {...defaultProps} onViewModeChange={onViewModeChange} />);

    fireEvent.click(screen.getByText('Week'));
    expect(onViewModeChange).toHaveBeenCalledWith('week');

    fireEvent.click(screen.getByText('Month'));
    expect(onViewModeChange).toHaveBeenCalledWith('month');

    fireEvent.click(screen.getByText('Day'));
    expect(onViewModeChange).toHaveBeenCalledWith('day');
  });

  it('highlights active view mode button', () => {
    const { rerender } = render(<CalendarToolbar {...defaultProps} viewMode="day" />);
    const dayBtn = screen.getByText('Day');
    expect(dayBtn.className).toContain('bg-white');

    rerender(<CalendarToolbar {...defaultProps} viewMode="week" />);
    const weekBtn = screen.getByText('Week');
    expect(weekBtn.className).toContain('bg-white');
    // Day should no longer be highlighted
    expect(screen.getByText('Day').className).not.toContain('bg-white');
  });
});
