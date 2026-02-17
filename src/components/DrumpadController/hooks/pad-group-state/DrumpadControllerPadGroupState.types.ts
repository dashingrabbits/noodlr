import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type {
PadGroupId,
PadGroupState,
PadGroupsState,
PadLoopEnabled,
PadNames,
PadPolyphony,
PadRowMuted,
PadSampleIds,
PadSampleSettingsMap,
PadStepLength,
PadStepOctaves,
PadStepSequence,
PadVolumes,
} from "../../DrumpadController.types";

export type UsePadGroupStateHandlersInput = {
  activePadGroupId: PadGroupId;
  buildPadGroupStateSnapshot: () => PadGroupState;
  cancelCountIn: () => void;
  clearScheduledTickVisualTimeouts: () => void;
  currentTickRef: MutableRefObject<number>;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  normalizePadGroupState: (candidatePadGroupState?: Partial<PadGroupState>) => PadGroupState;
  padGroupsState: PadGroupsState;
  sampleAssetsById: Map<string, SampleAsset>;
  setActivePadGroupId: Dispatch<SetStateAction<PadGroupId>>;
  setActivePatternId: Dispatch<SetStateAction<string>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setEditingPadId: Dispatch<SetStateAction<number | null>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setPadGroupsState: Dispatch<SetStateAction<PadGroupsState>>;
  setPadLoopEnabled: Dispatch<SetStateAction<PadLoopEnabled>>;
  setPadNames: Dispatch<SetStateAction<PadNames>>;
  setPadPolyphony: Dispatch<SetStateAction<PadPolyphony>>;
  setPadRowMuted: Dispatch<SetStateAction<PadRowMuted>>;
  setPadSampleIds: Dispatch<SetStateAction<PadSampleIds>>;
  setPadSampleSettings: Dispatch<SetStateAction<PadSampleSettingsMap>>;
  setPadStepLength: Dispatch<SetStateAction<PadStepLength>>;
  setPadStepOctaves: Dispatch<SetStateAction<PadStepOctaves>>;
  setPadStepSequence: Dispatch<SetStateAction<PadStepSequence>>;
  setPadVolumes: Dispatch<SetStateAction<PadVolumes>>;
  setSampleAssignPadId: Dispatch<SetStateAction<number | null>>;
  setSequencerPatterns: Dispatch<SetStateAction<PadGroupState["sequencerPatterns"]>>;
  stopAllLoopBufferSources: () => void;
  stopAllMetronomeSources: () => void;
  stopAllOneShotBufferSources: () => void;
  stopPreviewBufferSource: () => void;
};
