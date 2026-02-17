import type {
PadGroupId,
PadGroupsState,
SequencerPanelMode
} from "../../DrumpadController.types";

export type UseDrumpadControllerRefsInput = {
  activePadGroupId: PadGroupId;
  initialPadGroupsState: PadGroupsState;
  masterVolume: number;
  sequencerPanelMode: SequencerPanelMode;
};
