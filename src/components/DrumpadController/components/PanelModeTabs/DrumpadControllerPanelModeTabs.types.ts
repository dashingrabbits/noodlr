import type { SequencerPanelMode } from "../../DrumpadController.types";

export type DrumpadControllerPanelModeTabsProps = {
  sequencerPanelMode: SequencerPanelMode;
  onSelectSequencerPanelMode: (mode: SequencerPanelMode) => void;
};
