import React from 'react';
import { buildWaitlistModel, buildWaitlistActions } from '../presenters/waitlistPresenter.js';
import { WaitlistGroupList } from '../components/WaitlistGroupList.jsx';

/**
 * WaitlistSection - Delegates to presenter, renders waitlist UI.
 *
 * @param {Object} props
 * @param {Array<Object>} props.waitingGroups
 * @param {Function} props.moveInWaitlist
 * @param {Function} props.removeFromWaitlist
 */
export function WaitlistSection({ waitingGroups, moveInWaitlist, removeFromWaitlist }) {
  const model = buildWaitlistModel(waitingGroups);
  const actions = buildWaitlistActions(moveInWaitlist, removeFromWaitlist);

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
