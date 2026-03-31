import React from 'react';
import { ChevronRight } from '../components';

interface AIAssistantInputProps {
  input: string;
  isProcessing: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}
const AIAssistantInput = function AIAssistantInput({ input, isProcessing, onInputChange, onSend }: AIAssistantInputProps) {
  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSend()}
          placeholder="Type a command..."
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isProcessing}
          autoFocus
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isProcessing}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default AIAssistantInput;
