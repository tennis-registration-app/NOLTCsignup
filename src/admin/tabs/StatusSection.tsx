import React from "react";
import { CourtStatusGrid } from "../courts";
import { buildStatusModel, buildStatusActions } from "../presenters/statusPresenter";
import { WaitlistGroupList } from "../components/WaitlistGroupList";
import type {
  createStatusModel,
  createWetCourtsModel,
  createAdminServices,
  createStatusActions,
  createWetCourtsActions,
} from "../types/domainObjects";

type StatusModel = ReturnType<typeof createStatusModel>;
type WetCourtsModel = ReturnType<typeof createWetCourtsModel>;
type AdminServices = ReturnType<typeof createAdminServices>;
type StatusActions = ReturnType<typeof createStatusActions>;
type WetCourtsActions = ReturnType<typeof createWetCourtsActions>;

interface WaitlistGroup { names?: string[]; [key: string]: unknown; }

interface StatusSectionProps {
  statusModel: StatusModel;
  statusActions: StatusActions;
  wetCourtsModel: WetCourtsModel;
  wetCourtsActions: WetCourtsActions;
  services: AdminServices;
}

export function StatusSection({
  statusModel,
  statusActions,
  wetCourtsModel,
  wetCourtsActions,
  services,
}: StatusSectionProps) {
  const model = buildStatusModel(statusModel, wetCourtsModel, services);
  const actions = buildStatusActions(statusActions, wetCourtsActions);

  const waitingGroups = (model.waitingGroups ?? []) as WaitlistGroup[];
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

      <div
        className={waitingGroups.length === 0 ? "bg-white rounded-lg shadow-sm p-4" : "bg-white rounded-lg shadow-sm p-6"}
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
            moveInWaitlist={moveInWaitlist as (fromIndex: number, toIndex: number) => void}
            removeFromWaitlist={removeFromWaitlist as (index: number) => void}
          />
        )}
      </div>
    </div>
  );
}
