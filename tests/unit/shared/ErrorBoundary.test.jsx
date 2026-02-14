/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import ErrorBoundary from '../../../src/shared/components/ErrorBoundary.jsx';

// Helper component that throws on demand
function ThrowingChild({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child rendered</div>;
}

// Helper to render and get container
function renderToContainer(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

// Cleanup helper
function cleanup(container, root) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Tennis;
  });

  it('renders children when no error', () => {
    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <div>OK</div>
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('OK');
    cleanup(container, root);
  });

  it('renders fallback UI on error', () => {
    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Something went wrong');
    cleanup(container, root);
  });

  it('shows context in error message', () => {
    const { container, root } = renderToContainer(
      <ErrorBoundary context="Court Registration">
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Court Registration encountered an error');
    cleanup(container, root);
  });

  it('shows Reload and Copy Diagnostic buttons', () => {
    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    const buttons = container.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);

    expect(buttonTexts).toContain('Reload');
    expect(buttonTexts.some((t) => t.includes('Copy Diagnostic'))).toBe(true);
    cleanup(container, root);
  });

  it('calls console.error on catch', () => {
    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    // Find the call that contains [ErrorBoundary] (may not be first due to React warnings)
    const errorBoundaryCall = consoleErrorSpy.mock.calls.find(
      (call) => call[0] && typeof call[0] === 'string' && call[0].includes('[ErrorBoundary]')
    );
    expect(errorBoundaryCall).toBeTruthy();
    cleanup(container, root);
  });

  it('dispatches clientError event with expected fields', () => {
    let received = null;
    const handler = (e) => {
      received = e.detail;
    };
    window.addEventListener('clientError', handler, { once: true });

    const { container, root } = renderToContainer(
      <ErrorBoundary context="TestContext">
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(received).not.toBeNull();
    expect(received.message).toBe('Test error');
    expect(received.timestamp).toBeTruthy();
    expect(received.route).toBeDefined();
    expect(received.context).toBe('TestContext');

    cleanup(container, root);
  });

  it('prefers Tennis.Events.emitDom when available', () => {
    const emitDomMock = vi.fn();
    window.Tennis = { Events: { emitDom: emitDomMock } };

    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(emitDomMock).toHaveBeenCalled();
    expect(emitDomMock.mock.calls[0][0]).toBe('clientError');
    expect(emitDomMock.mock.calls[0][1]).toHaveProperty('message');

    cleanup(container, root);
    delete window.Tennis;
  });

  it('custom fallback render works', () => {
    const customFallback = (state) => <div>Custom: {state.error?.message}</div>;

    const { container, root } = renderToContainer(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Custom: Test error');
    cleanup(container, root);
  });

  it('clipboard fallback shows textarea on failure', async () => {
    // Stub clipboard to reject
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard failed')),
      },
      writable: true,
      configurable: true,
    });

    const { container, root } = renderToContainer(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    // Find and click Copy button
    const copyButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Copy Diagnostic')
    );
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton.click();
      // Allow async clipboard rejection to resolve
      await new Promise((r) => setTimeout(r, 10));
    });

    // Check for textarea fallback
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('Test error');

    cleanup(container, root);

    // Restore clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });
});
