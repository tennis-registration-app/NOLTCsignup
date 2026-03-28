/**
 * BlockWarningModal render branch tests
 *
 * Pure component — zero mocks needed.
 * Three branches: null, blocked, limited-time.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import BlockWarningModal from '../../../src/registration/modals/BlockWarningModal.jsx';

// ---------------------------------------------------------------------------
// Warning fixtures
// ---------------------------------------------------------------------------

const blockedWarning = {
  type: 'blocked',
  reason: 'Lessons',
  startTime: '2025-06-15T15:00:00Z',
  minutesUntilBlock: 10,
};

const limitedWarning = {
  type: 'limited',
  reason: 'Tournament',
  startTime: '2025-06-15T16:00:00Z',
  minutesUntilBlock: 45,
  limitedDuration: 40,
  originalDuration: 60,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlockWarningModal', () => {
  it('returns null when warning is null', () => {
    const { container } = render(
      <BlockWarningModal warning={null} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders blocked-state heading and body', () => {
    render(
      <BlockWarningModal warning={blockedWarning} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Court Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/block starts in 10 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Lessons/)).toBeInTheDocument();
  });

  it('renders limited-time heading and body', () => {
    render(
      <BlockWarningModal warning={limitedWarning} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Limited Playing Time')).toBeInTheDocument();
    expect(screen.getByText(/limited to/)).toBeInTheDocument();
    expect(screen.getByText(/40 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/usual 60 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Tournament/)).toBeInTheDocument();
  });

  it('shows only cancel button for blocked state', () => {
    render(
      <BlockWarningModal warning={blockedWarning} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Select Different Court')).toBeInTheDocument();
    expect(screen.queryByText(/Proceed/)).not.toBeInTheDocument();
  });

  it('shows confirm and cancel buttons for limited-time state', () => {
    render(
      <BlockWarningModal warning={limitedWarning} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Select Different Court')).toBeInTheDocument();
    expect(screen.getByText(/Proceed with 40 Minutes/)).toBeInTheDocument();
  });
});
