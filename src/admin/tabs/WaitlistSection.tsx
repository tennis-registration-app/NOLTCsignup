import React from "react";
import { buildWaitlistModel, buildWaitlistActions } from "../presenters/waitlistPresenter";
import { WaitlistGroupList } from "../components/WaitlistGroupList";
import type {
  createWaitlistModel,
  createWaitlistActions,
} from "../types/domainObjects";

type WaitlistModel = ReturnType<typeof createWaitlistModel>;
type WaitlistActions = ReturnType<typeof createWaitlistActions>;

interface WaitlistGroup { names?: string[]; [key: string]: unknown; }

interface WaitlistSectionProps {
  waitlistModel: WaitlistModel;
  waitlistActions: WaitlistActions;
}

export function WaitlistSection({ waitlistModel, waitlistActions }: WaitlistSectionProps) {
  const model = buildWaitlistModel(waitlistModel);
  const actions = buildWaitlistActions(waitlistActions);

  const waitingGroups = (model.waitingGroups ?? []) as WaitlistGroup[];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Waiting Groups ({waitingGroups.length})
      </h3>

      {waitingGroups.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No groups waiting</p>
      ) : (
        <WaitlistGroupList
          waitingGroups={waitingGroups}
          moveInWaitlist={actions.moveInWaitlist as (fromIndex: number, toIndex: number) => void}
          removeFromWaitlist={actions.removeFromWaitlist as (index: number) => void}
        />
      )}
    </div>
  );
}
