/**
 * Admin Panel - Main App Component
 *
 * Thin shell: context providers, useAdminAppState hook, JSX render.
 * All state setup, hook orchestration, and controller assembly
 * live in useAdminAppState.
 *
 * Auth-ready seam: see src/admin/guards/adminAccessGuard.js
 * Wire useAdminAccess() here when VITE_ADMIN_ACCESS_MODE=authenticated
 */
import React, { useState } from 'react';
import { NotificationProvider, useAdminNotification } from './context/NotificationContext';
import { ConfirmProvider, useAdminConfirm } from './context/ConfirmContext';

// Block management components
import { CompleteBlockManagerEnhanced } from './blocks';

// Screen components
import { GameHistorySearch, AnalyticsDashboard } from './screens';

// Tab section components
import { CalendarSection } from './tabs/CalendarSection';
import { HistorySection } from './tabs/HistorySection';
import { AnalyticsSection } from './tabs/AnalyticsSection';
import { BlockingSection } from './tabs/BlockingSection';
import { TabNavigation } from './tabs/TabNavigation';
import { StatusSection } from './tabs/StatusSection';
import { WaitlistSection } from './tabs/WaitlistSection';
import { SystemSection } from './tabs/SystemSection';
import { AIAssistantSection } from './tabs/AIAssistantSection';

// Handler modules
import { clearWaitlistOp } from './handlers/waitlistOperations';

// App state hook (all state, hooks, effects, controller assembly)
import { useAdminAppState } from './hooks/useAdminAppState';

// Main Admin Panel Component
const AdminPanelV2 = ({ onExit }) => {
  const showNotification = useAdminNotification() as (message: string, type: string) => void;
  const confirm = useAdminConfirm() as (message: string) => Promise<boolean>;

  const {
    wetCourtsController,
    blocks,
    status,
    waitlist,
    calendar,
    ai,
    adminServices,
    activeTab,
    setActiveTab,
    blockingView,
    setBlockingView,
    handleSettingsChanged,
    backend,
  } = useAdminAppState({ showNotification, confirm });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        blockingView={blockingView}
        setBlockingView={setBlockingView}
        onExit={onExit}
      />

      {/* Notification banner is rendered by NotificationProvider */}

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm -mt-px">
          {activeTab === 'status' && (
            <StatusSection
              statusModel={status.model}
              statusActions={status.actions}
              wetCourtsModel={wetCourtsController.model}
              wetCourtsActions={wetCourtsController.actions}
              services={adminServices}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarSection
              calendarModel={calendar.model}
              calendarActions={calendar.actions}
              services={adminServices}
              components={blocks.components}
            />
          )}
          {activeTab === 'blocking' && (
            <BlockingSection
              blockingView={blockingView}
              wetCourtsModel={wetCourtsController.model}
              wetCourtsActions={wetCourtsController.actions}
              blockModel={blocks.model}
              blockActions={blocks.actions}
              components={blocks.components}
              services={adminServices}
              CompleteBlockManagerEnhanced={CompleteBlockManagerEnhanced}
            />
          )}
          {activeTab === 'waitlist' && (
            <WaitlistSection waitlistModel={waitlist.model} waitlistActions={waitlist.actions} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsSection services={adminServices} AnalyticsDashboard={AnalyticsDashboard} />
          )}
          {activeTab === 'history' && (
            <HistorySection services={adminServices} GameHistorySearch={GameHistorySearch} />
          )}
        </div>
        {/* System tab - outside the white wrapper so cards have visible separation */}
        {activeTab === 'system' && (
          <SystemSection backend={backend} onSettingsChanged={handleSettingsChanged} />
        )}
      </div>

      {/* AI Assistant Button and Modal */}
      <AIAssistantSection
        aiModel={ai.model}
        aiActions={ai.actions}
        services={ai.services}
        components={ai.components}
        clearWaitlist={() => clearWaitlistOp(backend)}
      />
    </div>
  );
};

// Export the main App component (renamed from TestMenu)
export default function App() {
  const [view, setView] = useState('menu');

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-2">NOLTC Admin</h1>
          <p className="text-gray-500 mb-8">Staff access only</p>

          <button
            onClick={() => setView('admin')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <NotificationProvider>
        <ConfirmProvider>
          <AdminPanelV2 onExit={() => setView('menu')} />
        </ConfirmProvider>
      </NotificationProvider>
    );
  }

  // Fallback if components aren't available
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Component Not Found</h1>
        <p className="mb-4">The requested component is not available.</p>
        <button
          onClick={() => setView('menu')}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
