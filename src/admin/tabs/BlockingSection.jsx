import React from 'react';

/**
 * Pass-through wrapper for CompleteBlockManagerEnhanced.
 * Receives domain objects and forwards them unchanged.
 *
 * @param {Object} props
 * @param {string} props.blockingView - UI view mode
 * @param {import('../types/domainObjects.js').WetCourtsModel} props.wetCourtsModel
 * @param {import('../types/domainObjects.js').WetCourtsActions} props.wetCourtsActions
 * @param {import('../types/domainObjects.js').BlockModel} props.blockModel
 * @param {import('../types/domainObjects.js').BlockActions} props.blockActions
 * @param {import('../types/domainObjects.js').BlockComponents} props.components
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 * @param {import('react').ComponentType<unknown>} props.CompleteBlockManagerEnhanced - Injected component
 */
export function BlockingSection({
  blockingView,
  wetCourtsModel,
  wetCourtsActions,
  blockModel,
  blockActions,
  components,
  services,
  CompleteBlockManagerEnhanced,
}) {
  return (
    <div className="space-y-6 p-6 ">
      {/* Sub-tab Content */}
      {blockingView === 'create' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={components}
          services={services}
          defaultView="create"
        />
      )}

      {blockingView === 'future' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={components}
          services={services}
          defaultView="calendar"
        />
      )}

      {blockingView === 'list' && (
        <CompleteBlockManagerEnhanced
          wetCourtsModel={wetCourtsModel}
          wetCourtsActions={wetCourtsActions}
          blockModel={blockModel}
          blockActions={blockActions}
          components={components}
          services={services}
          defaultView="timeline"
        />
      )}
    </div>
  );
}
