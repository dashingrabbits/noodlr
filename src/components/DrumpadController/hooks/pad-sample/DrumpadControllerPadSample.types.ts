import { type Dispatch,type SetStateAction } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type { SavedDrumKit } from "../../../KitManager/KitManager.types";
import type {
PadLoopEnabled,
PadNames,
PadPolyphony,
PadSampleIds,
PadSampleSettingsMap,
PadVolumes
} from "../../DrumpadController.types";

export type UsePadSampleHandlersInput = {
  editingPadId: number | null;
  editingPadSampleId: string;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  padSampleSettings: PadSampleSettingsMap;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleAssignPadId: number | null;
  setEditingPadId: Dispatch<SetStateAction<number | null>>;
  setEditingPadSampleBuffer: Dispatch<SetStateAction<AudioBuffer | null>>;
  setIsEditingPadSampleBufferLoading: Dispatch<SetStateAction<boolean>>;
  setPadEditorSaveMessage: Dispatch<SetStateAction<string>>;
  setPadLoopEnabled: Dispatch<SetStateAction<PadLoopEnabled>>;
  setPadNames: Dispatch<SetStateAction<PadNames>>;
  setPadPolyphony: Dispatch<SetStateAction<PadPolyphony>>;
  setPadSampleIds: Dispatch<SetStateAction<PadSampleIds>>;
  setPadSampleSettings: Dispatch<SetStateAction<PadSampleSettingsMap>>;
  setPadVolumes: Dispatch<SetStateAction<PadVolumes>>;
  setSampleAssignPadId: Dispatch<SetStateAction<number | null>>;
  setSavedKits: Dispatch<SetStateAction<SavedDrumKit[]>>;
  stopLoopBufferSourceForPad: (padId: number) => void;
};
