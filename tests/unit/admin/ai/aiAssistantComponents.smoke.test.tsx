/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock shared icons
vi.mock('../../../../src/shared/ui/icons/Icons.jsx', () => {
  const stub = (name) => {
    const Icon = ({ size }) => (
      <span data-testid={`icon-${name}`}>{name}({size})</span>
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    ChevronRight: stub('ChevronRight'),
    Check: stub('Check'),
  };
});

import AIAssistantMessages from '../../../../src/admin/ai/AIAssistantMessages.jsx';
import AIAssistantInput from '../../../../src/admin/ai/AIAssistantInput.jsx';
import AIAssistantActionCard from '../../../../src/admin/ai/AIAssistantActionCard.jsx';

describe('AIAssistantMessages', () => {
  const messages = [
    { role: 'assistant', content: 'Hello from assistant' },
    { role: 'user', content: 'Block court 5' },
    { role: 'system', content: 'Done' },
  ];

  it('renders all messages', () => {
    const ref = { current: null };
    render(<AIAssistantMessages messages={messages} isProcessing={false} messagesEndRef={ref} />);
    expect(screen.getByText('Hello from assistant')).toBeTruthy();
    expect(screen.getByText('Block court 5')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('shows processing spinner when isProcessing is true', () => {
    const ref = { current: null };
    render(<AIAssistantMessages messages={[]} isProcessing={true} messagesEndRef={ref} />);
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('hides processing spinner when isProcessing is false', () => {
    const ref = { current: null };
    render(<AIAssistantMessages messages={[]} isProcessing={false} messagesEndRef={ref} />);
    expect(screen.queryByText('Processing...')).toBeNull();
  });

  it('applies user styling for user messages', () => {
    const ref = { current: null };
    render(
      <AIAssistantMessages
        messages={[{ role: 'user', content: 'test' }]}
        isProcessing={false}
        messagesEndRef={ref}
      />
    );
    const wrapper = screen.getByText('test').closest('.max-w-\\[80\\%\\]');
    expect(wrapper!.className).toContain('bg-blue-600');
  });

  it('applies warning styling for warning messages', () => {
    const ref = { current: null };
    render(
      <AIAssistantMessages
        messages={[{ role: 'assistant', content: 'careful', warning: true }]}
        isProcessing={false}
        messagesEndRef={ref}
      />
    );
    const wrapper = screen.getByText('careful').closest('.max-w-\\[80\\%\\]');
    expect(wrapper!.className).toContain('bg-orange-800');
  });

  it('applies error styling for error messages', () => {
    const ref = { current: null };
    render(
      <AIAssistantMessages
        messages={[{ role: 'assistant', content: 'oops', error: true }]}
        isProcessing={false}
        messagesEndRef={ref}
      />
    );
    const wrapper = screen.getByText('oops').closest('.max-w-\\[80\\%\\]');
    expect(wrapper!.className).toContain('bg-red-800');
  });

  it('renders children between spinner and scroll ref', () => {
    const ref = { current: null };
    render(
      <AIAssistantMessages messages={[]} isProcessing={false} messagesEndRef={ref}>
        <div data-testid="child">child content</div>
      </AIAssistantMessages>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});

describe('AIAssistantInput', () => {
  const defaultProps = {
    input: '',
    isProcessing: false,
    onInputChange: vi.fn(),
    onSend: vi.fn(),
  };

  it('renders input field with placeholder', () => {
    render(<AIAssistantInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type a command...')).toBeTruthy();
  });

  it('disables input when processing', () => {
    render(<AIAssistantInput {...defaultProps} isProcessing={true} />);
    expect(screen.getByPlaceholderText('Type a command...')).toHaveProperty('disabled', true);
  });

  it('disables send button when input is empty', () => {
    render(<AIAssistantInput {...defaultProps} input="" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveProperty('disabled', true);
  });

  it('enables send button when input has text', () => {
    render(<AIAssistantInput {...defaultProps} input="hello" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveProperty('disabled', false);
  });

  it('calls onInputChange when typing', () => {
    const onInputChange = vi.fn();
    render(<AIAssistantInput {...defaultProps} onInputChange={onInputChange} />);
    fireEvent.change(screen.getByPlaceholderText('Type a command...'), {
      target: { value: 'test' },
    });
    expect(onInputChange).toHaveBeenCalledWith('test');
  });

  it('calls onSend when send button clicked', () => {
    const onSend = vi.fn();
    render(<AIAssistantInput {...defaultProps} input="hello" onSend={onSend} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSend).toHaveBeenCalledOnce();
  });
});

describe('AIAssistantActionCard', () => {
  it('renders nothing when pendingAction is null', () => {
    const { container } = render(
      <AIAssistantActionCard pendingAction={null} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders confirm and cancel buttons when pendingAction is set', () => {
    render(
      <AIAssistantActionCard
        pendingAction={{ action: 'test' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('fires onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(
      <AIAssistantActionCard
        pendingAction={{ action: 'test' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('fires onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(
      <AIAssistantActionCard
        pendingAction={{ action: 'test' }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
