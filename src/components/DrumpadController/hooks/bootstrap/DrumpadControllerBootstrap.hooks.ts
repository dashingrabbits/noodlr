import { useRef } from "react";
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
import { clonePadGroupsState } from "../../helpers/pattern";
import type { SongArrangementTiming } from "../transport-timing";

import type {
UseDrumpadControllerRefsInput,
} from "./DrumpadControllerBootstrap.types";

export const useDrumpadControllerRefs = ({
  activePadGroupId,
  initialPadGroupsState,
  masterVolume,
  sequencerPanelMode,
}: UseDrumpadControllerRefsInput) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioContextResumePendingRef = useRef<Promise<void> | null>(null);
  const sampleBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sampleBufferPendingRef = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map());
  const importedSampleObjectUrlsRef = useRef<Set<string>>(new Set());
  const localSampleObjectUrlsRef = useRef<Set<string>>(new Set());
  const activeBufferSourcesByPadRef = useRef<
    Map<number, Array<{ source: AudioBufferSourceNode; gainNode: GainNode }>>
  >(new Map());
  const activeLoopBufferSourcesByPadRef = useRef<
    Map<number, { source: AudioBufferSourceNode; gainNode: GainNode; releaseSeconds: number }>
  >(new Map());
  const activeMetronomeSourcesRef = useRef<Set<OscillatorNode>>(new Set());
  const previewBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const outputCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const outputCompressorContextRef = useRef<AudioContext | null>(null);
  const reverbImpulseBufferRef = useRef<AudioBuffer | null>(null);
  const reverbImpulseBufferContextRef = useRef<AudioContext | null>(null);
  const playAssignedSampleRef = useRef<
    (padId: number, scheduledTime?: number, transposeSemitoneOffset?: number) => void
  >(() => {});
  const masterVolumeRef = useRef(masterVolume);
  const sequencerPanelModeRef = useRef<SequencerPanelMode>(sequencerPanelMode);
  const activePadGroupIdRef = useRef<PadGroupId>(activePadGroupId);
  const isPlayingRef = useRef(false);
  const padLoopEnabledRef = useRef<PadLoopEnabled>({});
  const padRowMutedRef = useRef<PadRowMuted>({});
  const padSampleSettingsRef = useRef<PadSampleSettingsMap>({});
  const padSampleIdsRef = useRef<PadSampleIds>({});
  const padStepSequenceRef = useRef<PadStepSequence>({});
  const padStepOctavesRef = useRef<PadStepOctaves>({});
  const padStepLengthRef = useRef<PadStepLength>({});
  const currentTickRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isMetronomeEnabledRef = useRef(false);
  const countInTimeoutsRef = useRef<number[]>([]);
  const isCountInActiveRef = useRef(false);
  const scheduledTickVisualTimeoutsRef = useRef<number[]>([]);
  const livePadGroupsStateRef = useRef<PadGroupsState>(clonePadGroupsState(initialPadGroupsState));
  const activeSceneRef = useRef<SceneDefinition | null>(null);
  const sceneDefinitionsByIdRef = useRef<Map<string, SceneDefinition>>(new Map());
  const songArrangementTimingRef = useRef<SongArrangementTiming>({
    totalTicks: 1,
    entryDurations: [],
  });
  const activeSceneDurationTicksRef = useRef(1);
  const padButtonElementsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const padFlashTimeoutsRef = useRef<Map<number, number>>(new Map());
  const sampleRootPromptProjectInputRef = useRef<HTMLInputElement | null>(null);
  const sampleRootPromptKitInputRef = useRef<HTMLInputElement | null>(null);

  return {
    activeBufferSourcesByPadRef,
    activeLoopBufferSourcesByPadRef,
    activeMetronomeSourcesRef,
    activePadGroupIdRef,
    activeSceneDurationTicksRef,
    activeSceneRef,
    audioContextRef,
    audioContextResumePendingRef,
    countInTimeoutsRef,
    currentTickRef,
    importedSampleObjectUrlsRef,
    isCountInActiveRef,
    isMetronomeEnabledRef,
    isPlayingRef,
    isRecordingRef,
    livePadGroupsStateRef,
    localSampleObjectUrlsRef,
    masterVolumeRef,
    outputCompressorContextRef,
    outputCompressorRef,
    padButtonElementsRef,
    padFlashTimeoutsRef,
    padLoopEnabledRef,
    padRowMutedRef,
    padSampleIdsRef,
    padSampleSettingsRef,
    padStepLengthRef,
    padStepOctavesRef,
    padStepSequenceRef,
    playAssignedSampleRef,
    previewBufferSourceRef,
    reverbImpulseBufferContextRef,
    reverbImpulseBufferRef,
    sampleBufferCacheRef,
    sampleBufferPendingRef,
    sampleRootPromptKitInputRef,
    sampleRootPromptProjectInputRef,
    sceneDefinitionsByIdRef,
    scheduledTickVisualTimeoutsRef,
    sequencerPanelModeRef,
    songArrangementTimingRef,
  };
};

