import React from 'react';

/**
 * AI Assistant admin section.
 * Domain-object wrapper: receives bundles from App.jsx.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').AIAssistantModel} props.aiModel
 * @param {import('../types/domainObjects.js').AIAssistantActions} props.aiActions
 * @param {import('../types/domainObjects.js').AIAssistantServices} props.services
 * @param {import('../types/domainObjects.js').AIAssistantComponents} props.components
 * @param {Function} props.clearWaitlist - pass-through (preserve existing inline lambda behavior)
 */
export function AIAssistantSection({ aiModel, aiActions, services, components, clearWaitlist }) {
  // Destructure domain objects to preserve original local names
  const { activeTab, showAIAssistant, USE_REAL_AI, courts, settings, waitingGroups } = aiModel;

  const {
    setShowAIAssistant,
    onAISettingsChanged,
    loadData,
    clearCourt,
    clearAllCourts,
    moveCourt,
    updateBallPrice,
    refreshData,
  } = aiActions;

  const { backend, dataStore } = services;
  const { AIAssistant, AIAssistantAdmin } = components;

  // Only show on specific tabs
  const showOnTabs = ['calendar', 'blocking', 'analytics', 'system', 'history'];
  if (!showOnTabs.includes(activeTab)) {
    return null;
  }

  return (
    <>
      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setShowAIAssistant(true)}
          className="bg-[#D97757] text-white p-3 rounded-full shadow-lg hover:bg-[#C4624A] transition-all transform hover:scale-110"
          title="Claude AI Assistant"
        >
          <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 C52 35 65 48 100 50 C65 52 52 65 50 100 C48 65 35 52 0 50 C35 48 48 35 50 0Z" />
          </svg>
        </button>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant &&
        (USE_REAL_AI ? (
          <AIAssistant
            backend={backend}
            onClose={() => setShowAIAssistant(false)}
            onSettingsChanged={onAISettingsChanged}
          />
        ) : (
          <AIAssistantAdmin
            onClose={() => setShowAIAssistant(false)}
            dataStore={dataStore}
            courts={courts}
            loadData={loadData}
            clearCourt={clearCourt}
            clearAllCourts={clearAllCourts}
            moveCourt={moveCourt}
            settings={settings}
            updateBallPrice={updateBallPrice}
            waitingGroups={waitingGroups}
            refreshData={refreshData}
            clearWaitlist={clearWaitlist}
          />
        ))}
    </>
  );
}
