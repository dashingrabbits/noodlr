import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type { SavedProject } from "../../../ProjectManager/ProjectManager.types";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadGroupId,
PadGroupState,
PadLoopEnabled,
PadNames,
PadRowMuted,
PadSampleIds,
PadSampleSettingsMap,
PadStepLength,
PadStepOctaves,
PadStepSequence,
PadVolumes,
SceneDefinition
} from "../../DrumpadController.types";

export type SongArrangementTiming = {
  totalTicks: number;
  entryDurations: Array<{
    sceneId: string;
    durationTicks: number;
    startTick: number;
    endTick: number;
  }>;
};

export type UseDrumpadAudioExportHandlersInput = {
  activePatternId: string;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  isExportingSong: boolean;
  livePadGroupsState: Record<PadGroupId, PadGroupState>;
  masterVolume: number;
  padLoopEnabled: PadLoopEnabled;
  padNames: PadNames;
  padRowMuted: PadRowMuted;
  padSampleIds: PadSampleIds;
  padSampleSettings: PadSampleSettingsMap;
  padStepLength: PadStepLength;
  padStepOctaves: PadStepOctaves;
  padStepSequence: PadStepSequence;
  padVolumes: PadVolumes;
  patternOptions: Array<{ id: string; name: string }>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  sceneDefinitionsById: Map<string, SceneDefinition>;
  selectedProject: SavedProject | null;
  sequencerBpm: number;
  sequencerClockStepLength: SequencerStepLength;
  sequencerEngineStepLength: SequencerStepLength;
  setIsExportingSong: Dispatch<SetStateAction<boolean>>;
  setSongModeStatusMessage: Dispatch<SetStateAction<string>>;
  songArrangementTiming: SongArrangementTiming;
};
