import React from 'react';
import { buildWaitlistModel, buildWaitlistActions } from '../presenters/waitlistPresenter.js';
import { WaitlistGroupList } from '../components/WaitlistGroupList.jsx';

/**
 * WaitlistSection - Delegates to presenter, renders waitlist UI.
 *
 * @param {Object} props
 * @param {import('../types/domainObjects.js').WaitlistModel} props.waitlistModel
 * @param {import('../types/domainObjects.js').WaitlistActions} props.waitlistActions
 */
export function WaitlistSection({ waitlistModel, waitlistActions }) {
  const model = buildWaitlistModel(waitlistModel);
  const actions = buildWaitlistActions(waitlistActions);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Waiting Groups ({model.waitingGroups.length})
      </h3>

      {model.waitingGroups.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No groups waiting</p>
      ) : (
        <WaitlistGroupList
          waitingGroups={model.waitingGroups}
          moveInWaitlist={actions.moveInWaitlist}
          removeFromWaitlist={actions.removeFromWaitlist}
        />
      )}
    </div>
  );
}
