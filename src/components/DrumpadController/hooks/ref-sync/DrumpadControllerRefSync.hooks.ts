
import type {
UseRefSynchronizationInput,
} from "./DrumpadControllerRefSync.types";

export const useRefSynchronization = ({
  activePadGroupId,
  activePadGroupIdRef,
  activeScene,
  activeSceneDurationTicks,
  activeSceneDurationTicksRef,
  activeSceneRef,
  currentStep,
  currentTickRef,
  isMetronomeEnabled,
  isMetronomeEnabledRef,
  isPlaying,
  isPlayingRef,
  isRecording,
  isRecordingRef,
  livePadGroupsState,
  livePadGroupsStateRef,
  masterVolume,
  masterVolumeRef,
  padLoopEnabled,
  padLoopEnabledRef,
  padRowMuted,
  padRowMutedRef,
  padSampleIds,
  padSampleIdsRef,
  padSampleSettings,
  padSampleSettingsRef,
  padStepLength,
  padStepLengthRef,
  padStepOctaves,
  padStepOctavesRef,
  padStepSequence,
  padStepSequenceRef,
  sceneDefinitionsById,
  sceneDefinitionsByIdRef,
  sequencerPanelMode,
  sequencerPanelModeRef,
  songArrangementTiming,
  songArrangementTimingRef,
}: UseRefSynchronizationInput) => {
  masterVolumeRef.current = masterVolume;
  sequencerPanelModeRef.current = sequencerPanelMode;
  activePadGroupIdRef.current = activePadGroupId;
  padLoopEnabledRef.current = padLoopEnabled;
  padRowMutedRef.current = padRowMuted;
  padSampleSettingsRef.current = padSampleSettings;
  padSampleIdsRef.current = padSampleIds;
  padStepSequenceRef.current = padStepSequence;
  padStepOctavesRef.current = padStepOctaves;
  padStepLengthRef.current = padStepLength;
  currentTickRef.current = currentStep;
  isPlayingRef.current = isPlaying;
  isRecordingRef.current = isRecording;
  isMetronomeEnabledRef.current = isMetronomeEnabled;

  livePadGroupsStateRef.current = livePadGroupsState;
  activeSceneRef.current = activeScene;
  sceneDefinitionsByIdRef.current = sceneDefinitionsById;
  songArrangementTimingRef.current = songArrangementTiming;
  activeSceneDurationTicksRef.current = activeSceneDurationTicks;
};

