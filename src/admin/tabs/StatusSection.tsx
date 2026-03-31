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
  const model = buildStatusModel(statusModel as unknown as Parameters<typeof buildStatusModel>[0], wetCourtsModel as unknown as Parameters<typeof buildStatusModel>[1], services as unknown as Parameters<typeof buildStatusModel>[2]);
  const actions = buildStatusActions(statusActions as unknown as Parameters<typeof buildStatusActions>[0], wetCourtsActions as unknown as Parameters<typeof buildStatusActions>[1]);

  const waitingGroups = (model.waitingGroups ?? []) as WaitlistGroup[];
  const { moveInWaitlist, removeFromWaitlist } = actions;

  return (
    <div className="p-6">
      <CourtStatusGrid
        statusModel={model.statusModel as unknown as Parameters<typeof CourtStatusGrid>[0]['statusModel']}
        statusActions={actions.statusActions as unknown as Parameters<typeof CourtStatusGrid>[0]['statusActions']}
        wetCourtsModel={model.wetCourtsModel as unknown as Parameters<typeof CourtStatusGrid>[0]['wetCourtsModel']}
        wetCourtsActions={actions.wetCourtsActions as unknown as Parameters<typeof CourtStatusGrid>[0]['wetCourtsActions']}
        services={model.services as unknown as Parameters<typeof CourtStatusGrid>[0]['services']}
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
