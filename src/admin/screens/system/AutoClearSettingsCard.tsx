// @ts-check
import React from 'react';

/**
 * AutoClearSettingsCard - Auto-clear and block warning settings
 */
const AutoClearSettingsCard = ({
  autoClearEnabled,
  autoClearMinutes,
  checkStatusMinutes,
  blockWarningMinutes,
  autoClearChanged,
  autoClearSaveStatus,
  autoClearError,
  handleAutoClearChange,
  saveAutoClear,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Court Auto-Clear</h3>
      <button
        onClick={saveAutoClear}
        disabled={!autoClearChanged}
        className={`px-4 py-2 rounded text-sm font-medium ${
          autoClearChanged
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : autoClearSaveStatus === 'saved'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {autoClearSaveStatus === 'saving'
          ? 'Saving...'
          : autoClearSaveStatus === 'saved'
            ? '✓ Saved'
            : 'Save'}
      </button>
    </div>

    {/* Enable toggle */}
    <div className="flex items-center gap-3 mb-4">
      <button
        type="button"
        onClick={() => handleAutoClearChange('enabled', !autoClearEnabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          autoClearEnabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            autoClearEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm font-medium text-gray-700">Enable Auto-Clear</span>
    </div>

    {/* Settings (shown only when enabled) */}
    {autoClearEnabled && (
      <div className="space-y-3 pl-1">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 w-48">
            Show &quot;check status&quot; warning after
          </label>
          <input
            type="number"
            min="30"
            max="600"
            value={checkStatusMinutes}
            onChange={(e) => handleAutoClearChange('checkStatusMinutes', e.target.value)}
            className="w-20 p-2 border rounded text-center"
          />
          <span className="text-sm text-gray-500">minutes</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 w-48">Auto-clear session after</label>
          <input
            type="number"
            min="60"
            max="720"
            value={autoClearMinutes}
            onChange={(e) => handleAutoClearChange('autoClearMinutes', e.target.value)}
            className="w-20 p-2 border rounded text-center"
          />
          <span className="text-sm text-gray-500">minutes</span>
        </div>
        <p className="text-xs text-gray-400 italic">
          Warning threshold must be less than auto-clear threshold
        </p>
      </div>
    )}

    {/* Block warning setting - always visible */}
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 w-48">Block warning notification</label>
        <input
          type="number"
          min="15"
          max="120"
          value={blockWarningMinutes}
          onChange={(e) => handleAutoClearChange('blockWarningMinutes', e.target.value)}
          className="w-20 p-2 border rounded text-center"
        />
        <span className="text-sm text-gray-500">minutes</span>
      </div>
      <p className="text-xs text-gray-400 italic mt-1">
        Display upcoming block warnings on courtboard and registration
      </p>
    </div>

    {/* Error message */}
    {autoClearError && <p className="text-red-600 text-sm mt-2">{autoClearError}</p>}
  </div>
);

export default AutoClearSettingsCard;
