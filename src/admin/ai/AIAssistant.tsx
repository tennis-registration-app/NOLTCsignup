import React, { useState, useRef, useEffect } from 'react';
import ProposedActions, { ProposedAction } from './ProposedActions';
import {
  normalizeAiResponse,
  normalizeAiAnalyticsSummary,
  normalizeAiHeatmapRow,
} from '../../lib/normalize/index';

interface AiMessage {
  role: string;
  content: string;
  timestamp?: Date;
  isError?: boolean;
  isCancelled?: boolean;
  isResult?: boolean;
}

interface AiBackend {
  admin: {
    aiAssistant: (params: Record<string, unknown>) => Promise<unknown>;
  };
}

interface AIAssistantProps {
  backend: AiBackend;
  onClose: () => void;
  onSettingsChanged?: () => Promise<void>;
}

/**
 * Production AI Assistant - replaces AIAssistantAdmin
 * Uses propose → confirm → execute pattern with real Claude API
 */
export default function AIAssistant({ backend, onClose, onSettingsChanged }: AIAssistantProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('draft'); // 'read' | 'draft'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending actions from draft response
  const [pendingActions, setPendingActions] = useState<ProposedAction[] | null>(null);
  const [actionsToken, setActionsToken] = useState<unknown>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (role: string, content: string, metadata: Partial<AiMessage> = {}) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date(), ...metadata }]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const rawResponse = await backend.admin.aiAssistant({
        prompt: userMessage,
        mode: mode,
      });
      // Normalize at ingestion
      const response = normalizeAiResponse(rawResponse as Record<string, unknown>);

      if (!response.ok) {
        throw new Error(response.error || 'Request failed');
      }

      // Add assistant response
      addMessage('assistant', response.response || 'Done.');

      // If draft mode returned proposed actions
      if (response.proposedToolCalls && response.proposedToolCalls.length > 0) {
        setPendingActions(response.proposedToolCalls as ProposedAction[]);
        setActionsToken(response.actionsToken);
        setRequiresConfirmation(response.requiresConfirmation || false);
      }
    } catch (err) {
      const e = err as Error;
      console.error('AI Assistant error:', e);
      setError(e.message || 'An error occurred');
      addMessage('assistant', `Error: ${e.message}`, { isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (confirmed: boolean) => {
    if (!actionsToken) return;

    setLoading(true);
    setError(null);

    try {
      // Note: actions_token and confirm_destructive are API request parameters (snake_case)
      const rawResponse = await backend.admin.aiAssistant({
        prompt: 'execute',
        mode: 'execute',
        actions_token: actionsToken, // API parameter (snake_case intentional)
        confirm_destructive: confirmed, // API parameter (snake_case intentional)
      });
      // Normalize response at ingestion
      const response = normalizeAiResponse(rawResponse as Record<string, unknown>);

      if (!response.ok) {
        throw new Error(response.error || 'Execution failed');
      }

      // Show execution results - include data for read tools
      const resultSummary =
        response.executedActions
          ?.map((a: Record<string, unknown>) => {
            if (!a.success) {
              return `${a.tool}: ✗ ${a.error}`;
            }
            // For analytics/read tools, show the actual data
            if (a.tool === 'get_analytics' && (a.result as Record<string, unknown>)?.data) {
              const data = (a.result as Record<string, unknown>).data as Record<string, unknown>;
              const normalizedSummary = normalizeAiAnalyticsSummary(data.summary as Record<string, unknown> | null);
              let summary = `${a.tool}: ✓\n`;
              if (normalizedSummary) {
                summary += `Sessions: ${normalizedSummary.totalSessions || 0}\n`;
                summary += `Total hours: ${normalizedSummary.totalHours?.toFixed(1) || 0}\n`;
              }
              const dataHeatmap = data.heatmap as Record<string, unknown>[];
              if (dataHeatmap && dataHeatmap.length > 0) {
                // Find busiest day - normalize heatmap rows
                const dayTotals: Record<string, number> = {};
                dataHeatmap.forEach((h) => {
                  const normalized = normalizeAiHeatmapRow(h);
                  dayTotals[normalized.dayOfWeek] =
                    (dayTotals[normalized.dayOfWeek] || 0) + normalized.sessionCount;
                });
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const busiest = Object.entries(dayTotals).sort(
                  (a, b) => Number(b[1]) - Number(a[1])
                )[0];
                if (busiest) {
                  summary += `Busiest day: ${days[Number(busiest[0])]} (${busiest[1]} sessions)`;
                }
              }
              const dataBuckets = data.buckets as unknown[] | undefined;
              if (dataBuckets) {
                summary += `Data points: ${dataBuckets.length}`;
              }
              return summary;
            }
            return `${a.tool}: ✓`;
          })
          .join('\n') || 'Actions executed.';

      addMessage('assistant', response.response + '\n\n' + resultSummary, { isResult: true });

      // Refresh settings if any settings-related tool was executed
      // Tool names are API constants (snake_case is intentional for matching)
      const settingsTools = ['update_settings', 'add_holiday_hours'];
      const executedActions = response.executedActions || [];
      if (executedActions.some((a: Record<string, unknown>) => a.success && settingsTools.includes(a.tool as string))) {
        if (onSettingsChanged) {
          await onSettingsChanged();
        }
      }

      // Clear pending actions
      setPendingActions(null);
      setActionsToken(null);
      setRequiresConfirmation(false);
    } catch (err) {
      const e = err as Error;
      console.error('Execute error:', e);
      setError(e.message);
      addMessage('assistant', `Execution failed: ${e.message}`, { isError: true });
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
                Try: &quot;What courts are available?&quot; or &quot;Block court 5 for
                maintenance&quot;
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
              disabled={loading || !!pendingActions}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !!pendingActions}
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
