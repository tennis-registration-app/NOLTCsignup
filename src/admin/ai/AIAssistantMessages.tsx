import React from 'react';

/** @type {React.FC<{messages: any[], isProcessing: boolean, messagesEndRef: any, children?: any}>} */
const AIAssistantMessages = function AIAssistantMessages({
  messages,
  isProcessing,
  messagesEndRef,
  children,
}) {
  return (
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

      {children}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default AIAssistantMessages;
