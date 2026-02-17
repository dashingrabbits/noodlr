import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadGroupId,
PadGroupsState,
PadGroupState,
PadRowMuted,
PadSampleIds,
PadStepLength,
PadStepOctaves,
PadStepSequence,
SceneDefinition,
SequencerPanelMode,
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

export type UseTransportOrchestrationInput = {
  activePadGroupIdRef: MutableRefObject<PadGroupId>;
  activeSceneDurationTicksRef: MutableRefObject<number>;
  activeSceneRef: MutableRefObject<SceneDefinition | null>;
  basePatternLoopTicks: number;
  clearScheduledTickVisualTimeouts: () => void;
  countInTimeoutsRef: MutableRefObject<number[]>;
  currentTickRef: MutableRefObject<number>;
  flashPadVisual: (padId: number) => void;
  getAudioContext: () => AudioContext | null;
  isCountInActiveRef: MutableRefObject<boolean>;
  isMetronomeEnabledRef: MutableRefObject<boolean>;
  isPlaying: boolean;
  isPlayingRef: MutableRefObject<boolean>;
  isRecording: boolean;
  isRecordingRef: MutableRefObject<boolean>;
  livePadGroupsStateRef: MutableRefObject<PadGroupsState>;
  masterVolume: number;
  masterVolumeRef: MutableRefObject<number>;
  padRowMutedRef: MutableRefObject<PadRowMuted>;
  padSampleIdsRef: MutableRefObject<PadSampleIds>;
  padStepLengthRef: MutableRefObject<PadStepLength>;
  padStepOctavesRef: MutableRefObject<PadStepOctaves>;
  padStepSequenceRef: MutableRefObject<PadStepSequence>;
  playAssignedSampleRef: MutableRefObject<
    (padId: number, scheduledTime?: number, transposeSemitoneOffset?: number) => void
  >;
  playbackSessionId: number;
  playSceneAssignedSample: (
    groupId: PadGroupId,
    groupState: PadGroupState,
    padId: number,
    scheduledTime?: number,
    transposeSemitoneOffset?: number
  ) => void;
  sceneDefinitionsByIdRef: MutableRefObject<Map<string, SceneDefinition>>;
  scheduleMetronomeTone: (
    context: AudioContext,
    scheduledTime: number,
    isAccent: boolean,
    metronomeGainLevel: number
  ) => void;
  scheduledTickVisualTimeoutsRef: MutableRefObject<number[]>;
  sequencerBpm: number;
  sequencerClockStepLength: SequencerStepLength;
  sequencerEngineStepLength: SequencerStepLength;
  sequencerPanelModeRef: MutableRefObject<SequencerPanelMode>;
  setCountInBeatsRemaining: Dispatch<SetStateAction<number | null>>;
  setCurrentSongEntryIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentSongEntryProgress: Dispatch<SetStateAction<number | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setPlaybackSessionId: Dispatch<SetStateAction<number>>;
  songArrangementTimingRef: MutableRefObject<SongArrangementTiming>;
  stopAllLoopBufferSources: () => void;
  stopAllMetronomeSources: () => void;
  stopAllOneShotBufferSources: () => void;
  stopPreviewBufferSource: () => void;
};
