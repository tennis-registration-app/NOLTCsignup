// @ts-nocheck — class component with arrow-function properties; TS checkJs cannot resolve this.props/this.setState
import React from 'react';

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children
 * @property {string} [context] - Label for error reporting (e.g., "Court Registration")
 * @property {Function} [fallback] - Optional (state, handleReload, handleCopy) => ReactNode
 */

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError
 * @property {Error|null} error
 * @property {Object|null} errorInfo
 * @property {boolean} copied
 * @property {boolean} showDiagText
 * @property {string} diagText
 */

/**
 * ErrorBoundary - Catches React component errors and displays fallback UI.
 *
 * Emits 'clientError' custom event with diagnostic details.
 * @extends {React.Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDiagText: false,
      diagText: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      copied: false,
      showDiagText: false,
      diagText: '',
    };
  }

  componentDidCatch(error, errorInfo) {
    // Store errorInfo for diagnostics
    this.setState({ errorInfo });

    // Build diagnostic detail
    const detail = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      context: this.props.context || 'App',
      route: typeof window !== 'undefined' ? window.location?.pathname : '',
      timestamp: new Date().toISOString(),
      deviceId: typeof window !== 'undefined' ? window.Tennis?.deviceId || 'unknown' : 'unknown',
    };

    // Log to console
    console.error('[ErrorBoundary]', this.props.context || 'App', error, errorInfo);

    // Emit clientError event
    try {
      if (typeof window !== 'undefined' && window.Tennis?.Events?.emitDom) {
        window.Tennis.Events.emitDom('clientError', detail);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clientError', { detail }));
      }
    } catch {
      /* swallow event dispatch errors */
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleCopy = async () => {
    const { error, errorInfo } = this.state;
    const diagData = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      context: this.props.context || 'App',
      route: typeof window !== 'undefined' ? window.location?.pathname : '',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    const diagText = JSON.stringify(diagData, null, 2);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(diagText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      } else {
        // Fallback: show textarea
        this.setState({ showDiagText: true, diagText });
      }
    } catch {
      // Clipboard failed, show textarea fallback
      this.setState({ showDiagText: true, diagText });
    }
  };

  render() {
    const { hasError, error, copied, showDiagText, diagText } = this.state;
    const { children, context, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback render
    if (typeof fallback === 'function') {
      return fallback(this.state, this.handleReload, this.handleCopy);
    }

    // Default fallback UI
    const contextLabel = context || 'App';

    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          {contextLabel} encountered an error. Please try reloading the page.
        </p>
        {error?.message && (
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#991b1b',
              backgroundColor: '#fef2f2',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reload
          </button>
          <button
            onClick={this.handleCopy}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {copied ? 'Copied!' : 'Copy Diagnostic Info'}
          </button>
        </div>
        {showDiagText && (
          <div
            style={{ marginTop: '1rem', textAlign: 'left', maxWidth: '600px', margin: '1rem auto' }}
          >
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Copy the text below manually:
            </p>
            <textarea
              readOnly
              value={diagText}
              style={{
                width: '100%',
                height: '200px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                resize: 'vertical',
              }}
            />
          </div>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
