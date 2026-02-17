import { type Dispatch,type SetStateAction } from "react";
import type { DrumKitState,SavedDrumKit } from "../../../KitManager/KitManager.types";
import type { PadGroupId,PadGroupsState } from "../../DrumpadController.types";

export type UseKitStateHandlersInput = {
  activePadGroupId: PadGroupId;
  applyPadGroupState: (candidatePadGroupState?: Partial<PadGroupsState[PadGroupId]>) => PadGroupsState[PadGroupId];
  buildDrumKitStateSnapshot: () => DrumKitState;
  buildPadGroupStateSnapshot: () => PadGroupsState[PadGroupId];
  savedKits: SavedDrumKit[];
  setPadGroupsState: Dispatch<SetStateAction<PadGroupsState>>;
  setSavedKits: Dispatch<SetStateAction<SavedDrumKit[]>>;
  stopAllLoopBufferSources: () => void;
};
