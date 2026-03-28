import React from 'react';
import { CourtStatusGrid } from '../courts';
import { buildStatusModel, buildStatusActions } from '../presenters/statusPresenter';
import { WaitlistGroupList } from '../components/WaitlistGroupList';

/**
 * StatusSection - Delegates to presenter, renders CourtStatusGrid + waitlist UI.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').StatusModel} props.statusModel
 * @param {import('../types/domainObjects.js').StatusActions} props.statusActions
 * @param {import('../types/domainObjects.js').WetCourtsModel} props.wetCourtsModel
 * @param {import('../types/domainObjects.js').WetCourtsActions} props.wetCourtsActions
 * @param {import('../types/domainObjects.js').AdminServices} props.services
 */
export function StatusSection({
  statusModel,
  statusActions,
  wetCourtsModel,
  wetCourtsActions,
  services,
}) {
  const model = buildStatusModel(statusModel, wetCourtsModel, services);
  const actions = buildStatusActions(statusActions, wetCourtsActions);

  const { waitingGroups } = model;
  const { moveInWaitlist, removeFromWaitlist } = actions;

  return (
    <div className="p-6">
      <CourtStatusGrid
        statusModel={model.statusModel}
        statusActions={actions.statusActions}
        wetCourtsModel={model.wetCourtsModel}
        wetCourtsActions={actions.wetCourtsActions}
        services={model.services}
      />

      {/* Waitlist Section */}
      <div
        className={`bg-white rounded-lg shadow-sm ${waitingGroups.length === 0 ? 'p-4' : 'p-6'}`}
      >
        {waitingGroups.length > 0 && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Waiting Groups ({waitingGroups.length})
          </h3>
        )}

        {waitingGroups.length === 0 ? (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Waiting Groups (0)</h3>
            <span className="text-sm text-gray-500">No groups waiting</span>
          </div>
        ) : (
          <WaitlistGroupList
            waitingGroups={waitingGroups}
            moveInWaitlist={moveInWaitlist}
            removeFromWaitlist={removeFromWaitlist}
          />
        )}
      </div>
    </div>
  );
}
