import React from 'react';
import { CalendarDays, Droplets } from '../../components';
import ConflictDetector from './ConflictDetector';
import RecurrenceConfig from '../RecurrenceConfig';
import CourtSelectionGrid from '../CourtSelectionGrid';
import BlockReasonSelector from '../BlockReasonSelector';

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * BlockForm
 *
 * Extracted from CompleteBlockManagerEnhanced.jsx
 * Form UI for creating/editing court blocks.
 *
 * @param {Object} props
 * @param {Object} props.form - Form state object from useBlockFormState
 * @param {Object} props.ui - UI state needed by form
 * @param {Object} props.handlers - Callbacks (onSubmit, onCancel, etc.)
 * @param {Object} props.data - External data (courts, backend, components, etc.)
 */
type RecurrenceConfig = {pattern: string; daysOfWeek?: number[]; endType?: string; occurrences?: number; endDate?: string};

interface BlockFormProps {
  form: {
    selectedCourts: number[];
    setSelectedCourts: (v: number[]) => void;
    blockReason: string;
    setBlockReason: (v: string) => void;
    startTime: string;
    setStartTime: (v: string) => void;
    endTime: string;
    setEndTime: (v: string) => void;
    selectedDate: Date;
    setSelectedDate: (v: Date) => void;
    recurrence: RecurrenceConfig | null;
    setRecurrence: (v: RecurrenceConfig | null) => void;
    isEvent: boolean;
    setIsEvent: (v: boolean) => void;
    eventType: string;
    editingBlock: Record<string, unknown> | null;
  };
  ui: {
    showTemplates: boolean;
    setShowTemplates: (v: boolean) => void;
    showRecurrence: boolean;
    setShowRecurrence: (v: boolean) => void;
    isValid: boolean;
    timePickerMode: string;
    setTimePickerMode: (v: string) => void;
  };
  handlers: {
    handleTemplateSelect: (t: {name: string; reason: string; duration?: number; startTime?: string; endTime?: string}) => void;
    toggleCourtSelection: (n: number) => void;
    handleQuickReasonSelect: (r: string) => void;
    handleBlockCourts: () => void;
    handleEmergencyWetCourt: () => void;
    deactivateWetCourts: () => void;
    clearWetCourt: (n: number) => void;
  };
  data: {
    courts: object[];
    wetCourtsActive: boolean;
    wetCourts: Set<number>;
    blockTemplates: Array<{name: string; reason: string}>;
    VisualTimeEntry: React.ComponentType<unknown> | undefined;
    MiniCalendar: React.ComponentType<unknown> | undefined;
  };
}

function BlockForm({ form, ui, handlers, data }: BlockFormProps) {
  // Destructure form (the hook return object)
  const {
    selectedCourts,
    setSelectedCourts,
    blockReason,
    setBlockReason,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    selectedDate,
    setSelectedDate,
    recurrence,
    setRecurrence,
    isEvent,
    setIsEvent,
    eventType,
    editingBlock,
  } = form;

  // Destructure UI state
  const {
    showTemplates,
    setShowTemplates,
    showRecurrence,
    setShowRecurrence,
    isValid,
    timePickerMode,
    setTimePickerMode,
  } = ui;

  // Destructure handlers
  const {
    handleTemplateSelect,
    toggleCourtSelection,
    handleQuickReasonSelect,
    handleBlockCourts,
    handleEmergencyWetCourt,
    deactivateWetCourts,
    clearWetCourt,
  } = handlers;

  // Destructure data
  const {
    courts,
    wetCourtsActive,
    wetCourts,
    blockTemplates,
    VisualTimeEntry: VisualTimeEntryRaw,
    MiniCalendar: MiniCalendarRaw,
  } = data;
  const VisualTimeEntry = VisualTimeEntryRaw as React.ComponentType<{key?: string; startTime: string; endTime: string; onStartTimeChange: (v: string) => void; onEndTimeChange: (v: string) => void; selectedDate: Date; selectedCourts: number[]; blockReason: string; timePickerMode: string; setTimePickerMode: (v: string) => void; hideToggleButton?: boolean}> | undefined;
  const MiniCalendar = MiniCalendarRaw as React.ComponentType<{selectedDate: Date; onDateSelect: (v: Date) => void}> | undefined;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div
        className="col-span-2"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
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

        <CourtSelectionGrid
          selectedCourts={selectedCourts}
          onToggleCourt={toggleCourtSelection}
          editingBlock={editingBlock}
          onSelectAll={() => setSelectedCourts([...Array(12)].map((_, i) => i + 1))}
          onClearSelection={() => setSelectedCourts([])}
        />

        <BlockReasonSelector
          blockReason={blockReason}
          onQuickReasonSelect={handleQuickReasonSelect}
          onCustomReasonChange={setBlockReason}
          wetCourtsActive={wetCourtsActive}
          wetCourts={wetCourts}
          deactivateWetCourts={deactivateWetCourts}
          handleEmergencyWetCourt={handleEmergencyWetCourt}
        />

        <div style={{ order: 3 }}>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            {VisualTimeEntry && (
              <VisualTimeEntry
                key={selectedDate.toISOString()}
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                selectedDate={selectedDate}
                selectedCourts={selectedCourts}
                blockReason={blockReason}
                timePickerMode={timePickerMode}
                setTimePickerMode={setTimePickerMode}
                hideToggleButton={true}
              />
            )}
          </div>
        </div>

        <ConflictDetector
          courts={courts as Parameters<typeof ConflictDetector>[0]["courts"]}
          selectedCourts={selectedCourts}
          startTime={startTime}
          endTime={endTime}
          selectedDate={selectedDate}
          editingBlock={editingBlock as {id: string} | null | undefined}
        />
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h3
            className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-100 pb-2"
            style={{ marginTop: '0', lineHeight: '1.75rem' }}
          >
            Select Date
          </h3>

          {MiniCalendar && (
            <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
          )}

          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-gray-600" />
              <span className="font-medium">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Wet Court Management Panel */}
        {wetCourtsActive && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-red-900">🌧️ Wet Court Conditions</h4>
              <span className="text-sm text-red-700">
                {12 - wetCourts.size}/12 courts operational
              </span>
            </div>

            <p className="text-sm text-red-800 mb-4">
              Click courts below as they dry to resume normal operations.
            </p>

            {/* Court Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((courtNum) => {
                const isWet = wetCourts.has(courtNum);
                return (
                  <button
                    key={courtNum}
                    onClick={() => clearWetCourt(courtNum)}
                    className={`p-2 rounded text-sm font-medium transition-all ${
                      isWet
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    Court {courtNum}
                    <div className="text-xs mt-1">{isWet ? '💧 Wet' : '☀️ Dry'}</div>
                  </button>
                );
              })}
            </div>

            {/* Quick Action */}
            <button
              onClick={() => {
                deactivateWetCourts();
              }}
              className="w-full py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
            >
              ✅ All Courts Dry - Resume Normal Operations
            </button>
          </div>
        )}

        {(selectedCourts.length > 0 || blockReason || startTime || endTime) && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Block Summary</h4>
            <div className="space-y-2 text-sm text-blue-800">
              {selectedCourts.length > 0 && (
                <div>
                  <span className="font-medium">Courts:</span>{' '}
                  {selectedCourts.sort((a, b) => a - b).join(', ')}
                </div>
              )}
              {blockReason && (
                <div>
                  <span className="font-medium">Reason:</span> {blockReason}
                </div>
              )}
              {startTime && endTime && (
                <div>
                  <span className="font-medium">Time:</span>{' '}
                  {startTime} - {endTime}
                </div>
              )}
              {recurrence && (
                <div>
                  <span className="font-medium">Repeats:</span> {recurrence.pattern.endsWith('ly') ? recurrence.pattern : recurrence.pattern + 'ly'}
                  {(recurrence.daysOfWeek?.length ?? 0) > 0 && ` on ${(recurrence.daysOfWeek ?? []).map((d: number) => DAY_ABBREVS[d]).join(', ')}`} for{' '}
                  {recurrence.endType === 'after'
                    ? `${recurrence.occurrences} times`
                    : `until ${recurrence.endDate}`}
                </div>
              )}
              {isEvent && (
                <div>
                  <span className="font-medium">Event Calendar:</span> Yes ({eventType})
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!isEvent}
              onChange={(e) => setIsEvent(!e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="font-medium">Hide on Calendar View</span>
          </label>

          <button
            onClick={() => setShowRecurrence(!showRecurrence)}
            className="py-2 px-3 rounded-lg font-medium transition-all shadow-sm border bg-white hover:bg-blue-50 text-gray-700 border-blue-300 hover:border-blue-400"
          >
            <div className="flex items-center gap-2">
              <span>Repeat</span>
              <span className="text-sm text-blue-600">{showRecurrence ? '△' : '▽'}</span>
            </div>
          </button>
        </div>

        {showRecurrence && (
          <RecurrenceConfig recurrence={recurrence} onRecurrenceChange={setRecurrence} />
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <button
            onClick={handleBlockCourts}
            disabled={!isValid}
            data-testid="admin-block-create-btn"
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {editingBlock ? 'Update' : 'Apply'} Block to{' '}
            {selectedCourts.length <= 3
              ? `Court${selectedCourts.length !== 1 ? 's' : ''} ${selectedCourts.sort((a, b) => a - b).join(', ')}`
              : `${selectedCourts.length} Courts`}
            {recurrence && ` (${recurrence.pattern.endsWith('ly') ? recurrence.pattern : recurrence.pattern + 'ly'})`}
          </button>

          <button
            onClick={wetCourtsActive ? deactivateWetCourts : handleEmergencyWetCourt}
            className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all border ${
              wetCourtsActive
                ? 'bg-gray-600 text-white border-blue-400 ring-1 ring-blue-400 shadow-md'
                : 'bg-blue-50 hover:bg-blue-100 text-gray-700 border-blue-300 hover:border-blue-400'
            }`}
          >
            <Droplets size={16} />
            WET COURTS
            {wetCourtsActive && wetCourts.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {wetCourts.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlockForm;
