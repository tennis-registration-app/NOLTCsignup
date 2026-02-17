/**
 * AIAssistantAdmin Component
 *
 * AI-powered chat interface for natural language court management commands.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Check } from '../components';
import { getCache } from '../../platform/prefsStorage.js';
import { useAdminNotification } from '../context/NotificationContext.jsx';

// Access global dependencies
const Storage = window.TENNIS_CONFIG || { STORAGE: { BLOCKS: 'courtBlocks' } };
const Events = window.Events || { emitDom: () => {} };
const BL = window.BL || {
  applyTemplate: () => [],
  overlaps: () => false,
};

const AIAssistantAdmin = ({
  onClose,
  dataStore,
  courts,
  loadData: _loadData,
  clearCourt,
  clearAllCourts,
  moveCourt,
  settings: _settings,
  updateBallPrice,
  waitingGroups,
  refreshData,
  clearWaitlist,
}) => {
  const showNotification = useAdminNotification();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! I can help you manage the courts. Try commands like:\n• "Block court 5 for maintenance"\n• "Who\'s playing right now?"\n• "Clear court 3"\n• "Move players from court 12 to court 6"\n• "Show waitlist"\n• "Set ball price to $6.50"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock command parser
  const parseCommand = (command) => {
    const lower = command.toLowerCase();

    // Block court commands
    if (lower.includes('block')) {
      const courtMatch = lower.match(/court[s]?\s+(\d+(?:\s*(?:,|and|&)\s*\d+)*)/);
      const timePattern = /(\d{1,2})\s*(?::|to|-)\s*(\d{1,2})\s*(?:am|pm)?/i;
      const timeMatch = lower.match(timePattern);
      const tomorrowMatch = lower.includes('tomorrow');
      const reasonMatch = lower.match(/for\s+(\w+)/);

      if (courtMatch) {
        // Parse court numbers (handles "1", "1,2", "1 and 2", "1, 3, and 5")
        const courtsText = courtMatch[1];
        const courtNumbers = courtsText.match(/\d+/g).map((n) => parseInt(n));

        // Determine reason
        let reason = 'BLOCKED';
        if (lower.includes('maintenance') || lower.includes('work')) reason = 'MAINTENANCE';
        else if (lower.includes('lesson')) reason = 'LESSON';
        else if (lower.includes('wet') || lower.includes('rain')) reason = 'WET COURT';
        else if (reasonMatch) reason = reasonMatch[1].toUpperCase();

        // Parse times
        let startTime, endTime;
        const now = new Date();

        if (timeMatch) {
          const [, start, end] = timeMatch;
          startTime = `${start}:00`;
          endTime = `${end}:00`;
        } else if (lower.includes('hour')) {
          const hourMatch = lower.match(/(\d+)\s*hour/);
          const hours = hourMatch ? parseInt(hourMatch[1]) : 2;
          startTime = now.toTimeString().slice(0, 5);
          const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
          endTime = endDate.toTimeString().slice(0, 5);
        } else {
          // Default: 2 hours from now
          startTime = now.toTimeString().slice(0, 5);
          const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          endTime = endDate.toTimeString().slice(0, 5);
        }

        return {
          action: 'blockCourts',
          courts: courtNumbers,
          reason: reason,
          startTime: startTime,
          endTime: endTime,
          date: tomorrowMatch ? 'tomorrow' : 'today',
          confirmMessage: `Block court${courtNumbers.length > 1 ? 's' : ''} ${courtNumbers.join(', ')} ${tomorrowMatch ? 'tomorrow' : 'today'} from ${startTime} to ${endTime} for ${reason.toLowerCase()}`,
        };
      }
    }

    // Clear court commands
    if (lower.includes('clear')) {
      if (lower.includes('all')) {
        return {
          action: 'clearAllCourts',
          confirmMessage: 'Clear all courts (this will make all courts immediately available)',
        };
      }
      if (lower.includes('waitlist')) {
        return {
          action: 'clearWaitlist',
          confirmMessage: 'Remove all groups from the waitlist',
        };
      }
      const courtMatch = lower.match(/court\s+(\d+)/);
      if (courtMatch) {
        return {
          action: 'clearCourt',
          courtNumber: parseInt(courtMatch[1]),
          confirmMessage: `Clear court ${courtMatch[1]}`,
        };
      }
    }

    // Move players command
    if (lower.includes('move')) {
      const fromMatch = lower.match(/(?:from\s+)?court\s+(\d+)/);
      const toMatch = lower.match(/to\s+court\s+(\d+)/);

      if (fromMatch && toMatch) {
        return {
          action: 'movePlayers',
          fromCourt: parseInt(fromMatch[1]),
          toCourt: parseInt(toMatch[1]),
          confirmMessage: `Move players from court ${fromMatch[1]} to court ${toMatch[1]}`,
        };
      }
    }

    // Status/query commands
    if (lower.includes('who') && (lower.includes('play') || lower.includes('court'))) {
      return { action: 'showStatus' };
    }

    if (lower.includes('waitlist') || lower.includes('waiting')) {
      return { action: 'showWaitlist' };
    }

    // Ball price command
    if (lower.includes('ball') && lower.includes('price')) {
      const priceMatch = lower.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        return {
          action: 'setBallPrice',
          price: parseFloat(priceMatch[1]),
          confirmMessage: `Set tennis ball price to $${parseFloat(priceMatch[1]).toFixed(2)}`,
        };
      }
    }

    // Ball sales report
    if (lower.includes('ball') && (lower.includes('sale') || lower.includes('sold'))) {
      return { action: 'showBallSales' };
    }

    return { action: 'unknown' };
  };

  // Execute mock commands
  const executeCommand = async (action) => {
    // Get current data from dataStore
    const data = (await dataStore.get('tennisClubData')) || { courts: [], waitingGroups: [] };

    switch (action.action) {
      case 'blockCourts': {
        // Create block times
        const now = new Date();
        let startDateTime = new Date();
        let endDateTime = new Date();

        if (action.date === 'tomorrow') {
          startDateTime.setDate(startDateTime.getDate() + 1);
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const [startHour, startMin] = action.startTime.split(':');
        const [endHour, endMin] = action.endTime.split(':');

        startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
        endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

        // read form values from existing variables
        const name = action.reason || 'Block'; // use reason as name for mock commands
        const reason = action.reason || '';
        const durationMinutes = Math.round((endDateTime - startDateTime) / (1000 * 60));
        const selectedCourts = action.courts;

        // validate minimally
        if (
          !name ||
          !reason ||
          !Number.isFinite(durationMinutes) ||
          durationMinutes <= 0 ||
          !Array.isArray(selectedCourts) ||
          selectedCourts.length === 0
        ) {
          showNotification(
            'Please provide name, reason, positive duration, and at least one court.',
            'error'
          );
          return;
        }

        const template = {
          name,
          reason,
          duration: Number(durationMinutes),
          courts: selectedCourts,
        };

        // domain: build blocks (one per court)
        const newBlocks = BL.applyTemplate({ template, now });

        // load/persist using existing key
        const key = Storage.STORAGE.BLOCKS;
        const existing = Storage.readJSON ? Storage.readJSON(key) || [] : [];

        // Prevent conflicts: if any new block overlaps an existing block on the same court, abort with a clear message.
        const conflicts = [];
        for (const nb of newBlocks) {
          for (const b of existing) {
            if (b.courtNumber === nb.courtNumber && BL.overlaps(nb, b)) {
              conflicts.push(nb.courtNumber);
              break;
            }
          }
        }
        if (conflicts.length) {
          showNotification(
            `Cannot add blocks. Overlaps on courts: ${[...new Set(conflicts)].sort((a, b) => a - b).join(', ')}`,
            'error'
          );
          return;
        }

        // Preserve additional properties
        for (const nb of newBlocks) {
          nb.id = `block-${Date.now()}-${nb.courtNumber}`;
          nb.createdAt = new Date().toISOString();
        }

        const next = existing.concat(newBlocks);
        if (Storage.writeJSON) {
          Storage.writeJSON(key, next);
        }
        // Note: If Storage.writeJSON is unavailable, blocks will not persist
        // This is acceptable as blocks are domain data managed by backend
        Events.emitDom('tennisDataUpdate', { key, data: next });
        console.log('[Admin] wrote blocks:', newBlocks);

        refreshData();

        return `✓ Blocked court${action.courts.length > 1 ? 's' : ''} ${action.courts.join(', ')}`;
      }

      case 'clearCourt': {
        const result = await clearCourt(action.courtNumber);
        return result.success
          ? `✓ Cleared court ${action.courtNumber}`
          : `✗ ${result.error || 'Failed to clear court'}`;
      }

      case 'clearAllCourts':
        await clearAllCourts();
        return '✓ All courts cleared';

      case 'clearWaitlist':
        // Clear waitlist via API
        if (typeof clearWaitlist === 'function') {
          const result = await clearWaitlist();
          if (!result?.ok) {
            throw new Error(result?.message || 'Failed to clear waitlist');
          }
          refreshData();
          return `✓ Waitlist cleared (${result.cancelledCount || 0} entries)`;
        } else {
          throw new Error('clearWaitlist function not available');
        }

      case 'movePlayers': {
        const moveResult = await moveCourt(action.fromCourt, action.toCourt);
        return moveResult.success
          ? `✓ Moved players from court ${action.fromCourt} to court ${action.toCourt}`
          : `✗ ${moveResult.error || 'Failed to move players'}`;
      }

      case 'setBallPrice':
        try {
          await updateBallPrice(action.price.toString());
          return `✓ Ball price set to $${action.price.toFixed(2)}`;
        } catch {
          return '✗ Failed to update ball price';
        }

      case 'showStatus': {
        const occupied = [];
        data.courts.forEach((court, idx) => {
          // Domain format: court.session.group.players
          const sessionPlayers = court?.session?.group?.players;
          if (court && (court.players?.length > 0 || sessionPlayers?.length > 0)) {
            const players = sessionPlayers || court.players || [];
            occupied.push({
              court: idx + 1,
              players: players.map((p) => p.name.split(' ').pop()).join(', '),
            });
          }
        });

        if (occupied.length === 0) {
          return 'All courts are currently available.';
        }

        return (
          `Currently ${occupied.length} courts occupied:\n` +
          occupied.map((c) => `• Court ${c.court}: ${c.players}`).join('\n') +
          `\n\n${courts.length - occupied.length} courts available.`
        );
      }

      case 'showWaitlist':
        if (waitingGroups.length === 0) {
          return 'No groups currently waiting.';
        }

        return (
          `${waitingGroups.length} groups waiting:\n` +
          waitingGroups
            .map((g, i) => `${i + 1}. ${g.players.map((p) => p.name.split(' ').pop()).join(', ')}`)
            .join('\n')
        );

      case 'showBallSales': {
        let sales = [];
        try {
          sales = getCache('ballPurchases') || [];
        } catch {
          /* transient partial write; use empty array */
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySales = sales.filter((s) => new Date(s.timestamp) >= today);
        const total = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

        return `Ball sales today:\n• ${todaySales.length} purchases\n• Total: $${total.toFixed(2)}`;
      }

      default:
        return '✗ Command not recognized';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(async () => {
      const parsed = parseCommand(input);

      if (parsed.action === 'unknown') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I didn't understand that command. Try:\n• "Block court 5 from 2-4pm"\n• "Who's playing?"\n• "Clear court 3"\n• "Move court 12 to court 6"\n• "Set ball price to $6.50"`,
            error: true,
          },
        ]);
      } else if (parsed.confirmMessage) {
        // Needs confirmation
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: parsed.confirmMessage + '?',
            warning: parsed.action.includes('clear'),
          },
        ]);
        setPendingAction(parsed);
      } else {
        // Execute immediately (status queries)
        const result = await executeCommand(parsed);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result,
          },
        ]);
      }

      setIsProcessing(false);
    }, 600);
  };

  const handleConfirm = async () => {
    if (pendingAction) {
      const result = await executeCommand(pendingAction);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: result,
        },
      ]);
      setPendingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl w-full max-w-3xl h-[600px] flex flex-col mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">AI Admin Assistant</h2>
            <p className="text-sm text-gray-400">Natural language court management</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                      ? 'bg-green-800 text-green-100'
                      : message.warning
                        ? 'bg-orange-800 text-orange-100'
                        : message.error
                          ? 'bg-red-800 text-red-100'
                          : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-white rounded-full"></div>
                  <span>Processing...</span>
                </div>
              </div>
            </div>
          )}

          {pendingAction && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={handleConfirm}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                Confirm
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                Cancel
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a command..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantAdmin;
