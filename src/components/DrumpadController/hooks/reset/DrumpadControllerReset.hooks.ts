import { useCallback } from "react";
import {
BASE_SEQUENCER_STEP_LENGTH,
DEFAULT_SEQUENCER_BPM
} from "../../../StepSequencer/StepSequencer.utilities";
import {
DEFAULT_ACTIVE_PAD_GROUP_ID,
DEFAULT_SEQUENCER_PANEL_MODE,
} from "../../constants";
import type {
PadSampleSettingsMap
} from "../../DrumpadController.types";
import { DEFAULT_PAD_VOLUME,normalizePadSampleSettings } from "../../DrumpadController.utilities";
import {
clonePadStepLength,
clonePadStepOctaves,
clonePadStepSequence,
cloneSequencerPatterns,
createInitialPadGroupsState,
} from "../../helpers/pattern";
import { createDefaultSceneDefinition } from "../../helpers/scene";

import type {
UseResetHandlersInput,
} from "./DrumpadControllerReset.types";

export const useResetHandlers = ({
  cancelCountIn,
  clearProjectLoadFeedback,
  clearScheduledTickVisualTimeouts,
  currentTickRef,
  handleCloseSaveProjectModal,
  setActivePadGroupId,
  setActivePatternId,
  setActiveSceneId,
  setCurrentSongEntryIndex,
  setCurrentSongEntryProgress,
  setCurrentStep,
  setEditingPadId,
  setEditingPadSampleBuffer,
  setIsEditingPadSampleBufferLoading,
  setIsExportingSong,
  setIsMetronomeEnabled,
  setIsPlaying,
  setIsRecording,
  setMasterVolume,
  setPadEditorSaveMessage,
  setPadGroupsState,
  setPadLoopEnabled,
  setPadNames,
  setPadPolyphony,
  setPadRowMuted,
  setPadSampleIds,
  setPadSampleSettings,
  setPadStepLength,
  setPadStepOctaves,
  setPadStepSequence,
  setPadVolumes,
  setSampleAssignPadId,
  setSceneDefinitions,
  setSelectedProjectId,
  setSequencerBpm,
  setSequencerClockStepLength,
  setSequencerPanelMode,
  setSequencerPatterns,
  setSongArrangement,
  setSongSceneDraftId,
  stopAllLoopBufferSources,
  stopAllOneShotBufferSources,
  stopPreviewBufferSource,
}: UseResetHandlersInput) => {
  const handleClearSequence = useCallback(() => {
    const defaultPadGroups = createInitialPadGroupsState();
    const defaultActiveGroup = defaultPadGroups[DEFAULT_ACTIVE_PAD_GROUP_ID];
    const defaultScene = createDefaultSceneDefinition(defaultPadGroups, 1);

    cancelCountIn();
    stopAllLoopBufferSources();
    stopAllOneShotBufferSources();
    stopPreviewBufferSource();
    clearScheduledTickVisualTimeouts();
    currentTickRef.current = 0;
    setCurrentStep(0);
    setIsPlaying(false);
    setIsRecording(false);
    setIsMetronomeEnabled(false);
    setMasterVolume(DEFAULT_PAD_VOLUME);
    setActivePadGroupId(DEFAULT_ACTIVE_PAD_GROUP_ID);
    setPadGroupsState(defaultPadGroups);
    setPadVolumes({ ...defaultActiveGroup.padVolumes });
    setPadNames({ ...defaultActiveGroup.padNames });
    setPadPolyphony({ ...defaultActiveGroup.padPolyphony });
    setPadLoopEnabled({ ...defaultActiveGroup.padLoopEnabled });
    setPadRowMuted({ ...defaultActiveGroup.padRowMuted });
    setPadSampleIds({ ...defaultActiveGroup.padSampleIds });
    setPadSampleSettings(
      Object.fromEntries(
        Object.entries(defaultActiveGroup.padSampleSettings).map(([padId, settings]) => [
          Number(padId),
          normalizePadSampleSettings(settings),
        ])
      ) as PadSampleSettingsMap
    );
    setSequencerPatterns(cloneSequencerPatterns(defaultActiveGroup.sequencerPatterns));
    setActivePatternId(defaultActiveGroup.activePatternId);
    setPadStepSequence(clonePadStepSequence(defaultActiveGroup.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(defaultActiveGroup.padStepOctaves));
    setPadStepLength(clonePadStepLength(defaultActiveGroup.padStepLength));
    setSequencerPanelMode(DEFAULT_SEQUENCER_PANEL_MODE);
    setSceneDefinitions([defaultScene]);
    setActiveSceneId(defaultScene.id);
    setSongArrangement([]);
    setSongSceneDraftId(defaultScene.id);
    setCurrentSongEntryIndex(null);
    setCurrentSongEntryProgress(null);
    setIsExportingSong(false);
    setSequencerBpm(DEFAULT_SEQUENCER_BPM);
    setSequencerClockStepLength(BASE_SEQUENCER_STEP_LENGTH);
    setSelectedProjectId("");
    setPadEditorSaveMessage("");
    setEditingPadId(null);
    setEditingPadSampleBuffer(null);
    setIsEditingPadSampleBufferLoading(false);
    setSampleAssignPadId(null);
    handleCloseSaveProjectModal();
    clearProjectLoadFeedback();
  }, [
    cancelCountIn,
    clearProjectLoadFeedback,
    clearScheduledTickVisualTimeouts,
    currentTickRef,
    handleCloseSaveProjectModal,
    setActivePadGroupId,
    setActivePatternId,
    setActiveSceneId,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    setEditingPadId,
    setEditingPadSampleBuffer,
    setIsEditingPadSampleBufferLoading,
    setIsExportingSong,
    setIsMetronomeEnabled,
    setIsPlaying,
    setIsRecording,
    setMasterVolume,
    setPadEditorSaveMessage,
    setPadGroupsState,
    setPadLoopEnabled,
    setPadNames,
    setPadPolyphony,
    setPadRowMuted,
    setPadSampleIds,
    setPadSampleSettings,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setPadVolumes,
    setSampleAssignPadId,
    setSceneDefinitions,
    setSelectedProjectId,
    setSequencerBpm,
    setSequencerClockStepLength,
    setSequencerPanelMode,
    setSequencerPatterns,
    setSongArrangement,
    setSongSceneDraftId,
    stopAllLoopBufferSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  ]);

  const handleCreateNewProject = useCallback(() => {
    handleClearSequence();
  }, [handleClearSequence]);

  return {
    handleClearSequence,
    handleCreateNewProject,
  };
};

