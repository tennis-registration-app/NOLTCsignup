import React from 'react';
import { buildBlockingModel, buildBlockingActions } from '../presenters/blockingPresenter.js';

/**
 * BlockingSection - Thin wrapper that delegates to presenter.
 *
 * Receives domain objects from App.jsx, transforms via presenter,
 * and forwards to CompleteBlockManagerEnhanced.
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
  const model = buildBlockingModel(blockingView, wetCourtsModel, blockModel, components, services);
  const actions = buildBlockingActions(wetCourtsActions, blockActions);

  return (
    <div className="space-y-6 p-6 ">
      <CompleteBlockManagerEnhanced
        wetCourtsModel={model.wetCourtsModel}
        wetCourtsActions={actions.wetCourtsActions}
        blockModel={model.blockModel}
        blockActions={actions.blockActions}
        components={model.components}
        services={model.services}
        defaultView={model.defaultView}
      />
    </div>
  );
}
