/**
 * BlockTemplateManager Component
 *
 * Manages quick block templates - save, delete, and apply.
 */
import React, { useState } from 'react';
import { Plus, CheckCircle, Trash2 } from '../components';

// Config import (ESM canonical source)
import { TENNIS_CONFIG } from '../../lib/config.js';

const BlockTemplateManager = ({ templates, onSave, onDelete, onApply }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    reason: '',
    duration: 60,
    courts: [],
  });

  const handleSave = () => {
    if (newTemplate.name && newTemplate.reason && newTemplate.courts.length > 0) {
      onSave({
        ...newTemplate,
        id: Date.now().toString(),
      });
      setNewTemplate({ name: '', reason: '', duration: 60, courts: [] });
      setShowCreate(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Quick Templates</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-blue-600 hover:text-blue-700 p-1"
        >
          <Plus size={20} />
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="Template name"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            className="w-full mb-2 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Block reason"
            value={newTemplate.reason}
            onChange={(e) => setNewTemplate({ ...newTemplate, reason: e.target.value })}
            className="w-full mb-2 p-2 border rounded"
          />
          <div className="mb-2">
            <label className="text-sm text-gray-600">Duration (minutes)</label>
            <input
              type="number"
              value={newTemplate.duration}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, duration: parseInt(e.target.value) })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-2">
            <label className="text-sm text-gray-600">Courts</label>
            <div className="grid grid-cols-6 gap-1">
              {[...Array(TENNIS_CONFIG.COURTS.TOTAL_COUNT)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const courts = newTemplate.courts.includes(i + 1)
                      ? newTemplate.courts.filter((c) => c !== i + 1)
                      : [...newTemplate.courts, i + 1];
                    setNewTemplate({ ...newTemplate, courts });
                  }}
                  className={`p-1 text-xs rounded ${
                    newTemplate.courts.includes(i + 1) ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div>
              <div className="font-medium text-sm">{template.name}</div>
              <div className="text-xs text-gray-600">
                {template.reason} • {template.duration}min • Courts: {template.courts.join(', ')}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onApply(template)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => onDelete(template.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockTemplateManager;
