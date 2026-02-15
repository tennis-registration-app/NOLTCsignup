// @ts-check
import React from 'react';

/**
 * QuickTemplatesCard - Collapsible template selection panel
 */
const QuickTemplatesCard = ({
  showTemplates,
  setShowTemplates,
  blockTemplates,
  handleTemplateSelect,
}) => (
  <div style={{ order: 4 }}>
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Quick Templates</h3>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>{showTemplates ? 'Hide' : 'Show'}</span>
          <span className="text-xs">{showTemplates ? '△' : '▽'}</span>
        </button>
      </div>

      {showTemplates && (
        <div className="grid grid-cols-2 gap-3">
          {blockTemplates.map((template, idx) => (
            <button
              key={idx}
              onClick={() => handleTemplateSelect(template)}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left border border-gray-200"
            >
              <p className="font-medium text-gray-800">{template.name}</p>
              <p className="text-sm text-gray-600">{template.reason}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default QuickTemplatesCard;
