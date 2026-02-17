import type { MutableRefObject } from "react";
import type {
PadGroupId,
PadGroupsState,
PadLoopEnabled,
PadRowMuted,
PadSampleIds,
PadSampleSettingsMap,
PadStepLength,
PadStepOctaves,
PadStepSequence,
SceneDefinition,
SequencerPanelMode,
} from "../../DrumpadController.types";
import type { SongArrangementTiming } from "../transport-timing";

export type UseRefSynchronizationInput = {
  activePadGroupId: PadGroupId;
  activePadGroupIdRef: MutableRefObject<PadGroupId>;
  activeScene: SceneDefinition | null;
  activeSceneDurationTicks: number;
  activeSceneDurationTicksRef: MutableRefObject<number>;
  activeSceneRef: MutableRefObject<SceneDefinition | null>;
  currentStep: number;
  currentTickRef: MutableRefObject<number>;
  isMetronomeEnabled: boolean;
  isMetronomeEnabledRef: MutableRefObject<boolean>;
  isPlaying: boolean;
  isPlayingRef: MutableRefObject<boolean>;
  isRecording: boolean;
  isRecordingRef: MutableRefObject<boolean>;
  livePadGroupsState: PadGroupsState;
  livePadGroupsStateRef: MutableRefObject<PadGroupsState>;
  masterVolume: number;
  masterVolumeRef: MutableRefObject<number>;
  padLoopEnabled: PadLoopEnabled;
  padLoopEnabledRef: MutableRefObject<PadLoopEnabled>;
  padRowMuted: PadRowMuted;
  padRowMutedRef: MutableRefObject<PadRowMuted>;
  padSampleIds: PadSampleIds;
  padSampleIdsRef: MutableRefObject<PadSampleIds>;
  padSampleSettings: PadSampleSettingsMap;
  padSampleSettingsRef: MutableRefObject<PadSampleSettingsMap>;
  padStepLength: PadStepLength;
  padStepLengthRef: MutableRefObject<PadStepLength>;
  padStepOctaves: PadStepOctaves;
  padStepOctavesRef: MutableRefObject<PadStepOctaves>;
  padStepSequence: PadStepSequence;
  padStepSequenceRef: MutableRefObject<PadStepSequence>;
  sceneDefinitionsById: Map<string, SceneDefinition>;
  sceneDefinitionsByIdRef: MutableRefObject<Map<string, SceneDefinition>>;
  sequencerPanelMode: SequencerPanelMode;
  sequencerPanelModeRef: MutableRefObject<SequencerPanelMode>;
  songArrangementTiming: SongArrangementTiming;
  songArrangementTimingRef: MutableRefObject<SongArrangementTiming>;
};
