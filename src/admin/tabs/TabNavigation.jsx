import React from 'react';
import {
  Calendar,
  Settings,
  ChevronLeft,
  Grid,
  BarChart,
  FileText,
  greyFilter,
} from '../components';

export function TabNavigation({ activeTab, setActiveTab, blockingView, setBlockingView, onExit }) {
  return (
    <div className="bg-gray-50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Tabs Container */}
          <div className="flex items-end gap-2 py-4">
            {/* Court Status Tab */}
            <button
              onClick={() => setActiveTab('status')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'status'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'status' ? greyFilter : {}}>
                {React.createElement(Grid, { size: 24 })}
              </span>
              <span>Court Status</span>
            </button>

            {/* Event Calendar Tab - No sub-tabs */}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'calendar'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'calendar' ? greyFilter : {}}>
                {React.createElement(Calendar, { size: 24 })}
              </span>
              <span>Event Calendar</span>
            </button>

            {/* Court Blocking Tab */}
            <button
              onClick={() => {
                setActiveTab('blocking');
                setBlockingView('create');
              }}
              data-testid="admin-nav-blocks"
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'blocking'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'blocking' ? greyFilter : {}}>
                {React.createElement(Calendar, { size: 24 })}
              </span>
              <span>Court Blocking</span>
            </button>

            {/* Analytics Tab */}
            <button
              onClick={() => setActiveTab('analytics')}
              data-testid="admin-nav-analytics"
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'analytics' ? greyFilter : {}}>
                {React.createElement(BarChart, { size: 24 })}
              </span>
              <span>Analytics</span>
            </button>

            {/* Game History Tab */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'history' ? greyFilter : {}}>
                <FileText size={24} />
              </span>
              <span>Game History</span>
            </button>

            {/* System Tab */}
            <button
              onClick={() => setActiveTab('system')}
              data-testid="admin-nav-settings"
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200 ${
                activeTab === 'system'
                  ? 'bg-white text-gray-900 rounded-lg shadow-lg shadow-blue-200 border border-blue-200 transform -translate-y-px'
                  : 'bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300'
              }`}
            >
              <span style={activeTab !== 'system' ? greyFilter : {}}>
                {React.createElement(Settings, { size: 24 })}
              </span>
              <span>System</span>
            </button>
          </div>

          {/* Exit button on the right */}
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            <ChevronLeft size={20} />
            Exit Admin
          </button>
        </div>
      </div>

      {/* Sub-tabs container - Only for Court Blocking now */}
      <div
        className={`bg-gray-100 border-t border-gray-200 transition-all duration-500 ease-in-out overflow-hidden ${
          activeTab === 'blocking' ? 'max-h-20' : 'max-h-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-2">
            {/* Blocking Sub-tabs */}
            {activeTab === 'blocking' && (
              <>
                <button
                  onClick={() => setBlockingView('create')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    blockingView === 'create'
                      ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                      : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  Create Blocks
                </button>
                <button
                  onClick={() => setBlockingView('future')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    blockingView === 'future'
                      ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                      : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  Blocked Time
                </button>
                <button
                  onClick={() => setBlockingView('list')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    blockingView === 'list'
                      ? 'font-bold text-gray-900 bg-blue-50 border border-blue-200'
                      : 'font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  List
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom border line */}
      <div className="h-px bg-gray-200"></div>
    </div>
  );
}
