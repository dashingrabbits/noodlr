import { useCallback } from "react";
import type { DrumKitState,SavedDrumKit } from "../../../KitManager/KitManager.types";
import { createSavedKitId,writeSavedKitsToSession } from "../../../KitManager/KitManager.utilities";
import type { PadSampleIds } from "../../DrumpadController.types";
import { normalizePadGroupState } from "../../helpers/normalization";
import { clonePadGroupState } from "../../helpers/pattern";

import type {
UseKitStateHandlersInput,
} from "./DrumpadControllerKitState.types";

export const useKitStateHandlers = ({
  activePadGroupId,
  applyPadGroupState,
  buildDrumKitStateSnapshot,
  buildPadGroupStateSnapshot,
  savedKits,
  setPadGroupsState,
  setSavedKits,
  stopAllLoopBufferSources,
}: UseKitStateHandlersInput) => {
  const applyDrumKitState = useCallback(
    (candidateKitState: Partial<DrumKitState>) => {
      const currentPadGroupSnapshot = buildPadGroupStateSnapshot();
      const nextPadGroupState = normalizePadGroupState({
        ...currentPadGroupSnapshot,
        padVolumes: {
          ...currentPadGroupSnapshot.padVolumes,
          ...(candidateKitState.padVolumes ?? {}),
        },
        padNames: {
          ...currentPadGroupSnapshot.padNames,
          ...(candidateKitState.padNames ?? {}),
        },
        padPolyphony: {
          ...currentPadGroupSnapshot.padPolyphony,
          ...(candidateKitState.padPolyphony ?? {}),
        },
        padLoopEnabled: {
          ...currentPadGroupSnapshot.padLoopEnabled,
          ...(candidateKitState.padLoopEnabled ?? {}),
        },
        padSampleIds: {
          ...(candidateKitState.padSampleIds ?? {}),
        } as PadSampleIds,
        padSampleSettings: {
          ...currentPadGroupSnapshot.padSampleSettings,
          ...(candidateKitState.padSampleSettings ?? {}),
        },
      });

      stopAllLoopBufferSources();
      applyPadGroupState(nextPadGroupState);
      setPadGroupsState((previous) => ({
        ...previous,
        [activePadGroupId]: clonePadGroupState(nextPadGroupState),
      }));
    },
    [
      activePadGroupId,
      applyPadGroupState,
      buildPadGroupStateSnapshot,
      setPadGroupsState,
      stopAllLoopBufferSources,
    ]
  );

  const handleSaveKit = useCallback(
    (kitName: string) => {
      const normalizedKitName = kitName.trim();
      if (!normalizedKitName) {
        return;
      }

      const nowIso = new Date().toISOString();
      const nextKit: SavedDrumKit = {
        id: createSavedKitId(),
        name: normalizedKitName,
        createdAt: nowIso,
        updatedAt: nowIso,
        state: buildDrumKitStateSnapshot(),
      };

      setSavedKits((previous) => {
        const nextKits = [nextKit, ...previous];
        writeSavedKitsToSession(nextKits);
        return nextKits;
      });
    },
    [buildDrumKitStateSnapshot, setSavedKits]
  );

  const handleLoadKit = useCallback(
    (kitId: string) => {
      const kit = savedKits.find((candidate) => candidate.id === kitId);
      if (!kit) {
        return;
      }

      applyDrumKitState(kit.state as Partial<DrumKitState>);
    },
    [applyDrumKitState, savedKits]
  );

  return {
    applyDrumKitState,
    handleLoadKit,
    handleSaveKit,
  };
};

