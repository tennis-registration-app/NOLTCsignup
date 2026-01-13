import React, { useState, useRef, useEffect } from 'react';
import ProposedActions from './ProposedActions';

/**
 * Production AI Assistant - replaces MockAIAdmin
 * Uses propose → confirm → execute pattern with real Claude API
 */
export default function AIAssistant({ backend, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('draft'); // 'read' | 'draft'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pending actions from draft response
  const [pendingActions, setPendingActions] = useState(null);
  const [actionsToken, setActionsToken] = useState(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (role, content, metadata = {}) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date(), ...metadata }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setPendingActions(null);
    setActionsToken(null);

    addMessage('user', userMessage);
    setLoading(true);

    try {
      const response = await backend.admin.aiAssistant({
        prompt: userMessage,
        mode: mode,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Request failed');
      }

      // Add assistant response
      addMessage('assistant', response.response || 'Done.');

      // If draft mode returned proposed actions
      if (response.proposed_tool_calls && response.proposed_tool_calls.length > 0) {
        setPendingActions(response.proposed_tool_calls);
        setActionsToken(response.actions_token);
        setRequiresConfirmation(response.requires_confirmation || false);
      }
    } catch (err) {
      console.error('AI Assistant error:', err);
      setError(err.message || 'An error occurred');
      addMessage('assistant', `Error: ${err.message}`, { isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (confirmed) => {
    if (!actionsToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await backend.admin.aiAssistant({
        prompt: 'execute',
        mode: 'execute',
        actions_token: actionsToken,
        confirm_destructive: confirmed,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Execution failed');
      }

      // Show execution results
      const resultSummary =
        response.executed_actions
          ?.map((a) => `${a.tool}: ${a.success ? '✓' : '✗ ' + a.error}`)
          .join('\n') || 'Actions executed.';

      addMessage('assistant', response.response + '\n\n' + resultSummary, { isResult: true });

      // Clear pending actions
      setPendingActions(null);
      setActionsToken(null);
      setRequiresConfirmation(false);
    } catch (err) {
      console.error('Execute error:', err);
      setError(err.message);
      addMessage('assistant', `Execution failed: ${err.message}`, { isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingActions(null);
    setActionsToken(null);
    setRequiresConfirmation(false);
    addMessage('assistant', 'Action cancelled.', { isCancelled: true });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">AI Admin Assistant</h2>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-gray-50"
              disabled={loading}
            >
              <option value="read">Read Only</option>
              <option value="draft">Draft Mode</option>
            </select>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-2">How can I help you manage the courts?</p>
              <p className="text-sm">
                Try: "What courts are available?" or "Block court 5 for maintenance"
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.isError
                      ? 'bg-red-100 text-red-800'
                      : msg.isCancelled
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-600">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Proposed Actions Panel */}
        {pendingActions && pendingActions.length > 0 && (
          <ProposedActions
            actions={pendingActions}
            requiresConfirmation={requiresConfirmation}
            onExecute={handleExecute}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'read' ? 'Ask a question...' : 'Ask or request an action...'}
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || pendingActions}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || pendingActions}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}
