import { useCallback } from "react";
import type { ProjectState } from "../../../ProjectManager/ProjectManager.types";
import {
BASE_SEQUENCER_STEP_LENGTH,
DEFAULT_SEQUENCER_BPM,
clampSequencerBpm
} from "../../../StepSequencer/StepSequencer.utilities";
import { DEFAULT_ACTIVE_PAD_GROUP_ID,PAD_GROUP_IDS } from "../../constants";
import type {
PadGroupsState,
PadStepLength,
PadStepOctaves
} from "../../DrumpadController.types";
import { DEFAULT_PAD_VOLUME } from "../../DrumpadController.utilities";
import {
normalizePadGroupState,
normalizeSceneDefinitions,
normalizeSequencerPanelMode,
normalizeSongArrangement,
} from "../../helpers/normalization";
import {
createDefaultPadGroupState,
isPadGroupId,
isSequencerStepLength,
} from "../../helpers/pattern";

import type {
ApplyProjectStateOptions,
UseApplyProjectStateInput,
} from "./DrumpadControllerApplyProjectState.types";

export const useApplyProjectState = ({
  applyPadGroupState,
  cancelCountIn,
  currentTickRef,
  setActivePadGroupId,
  setActiveSceneId,
  setCurrentSongEntryIndex,
  setCurrentSongEntryProgress,
  setCurrentStep,
  setIsMetronomeEnabled,
  setIsPlaying,
  setIsRecording,
  setMasterVolume,
  setPadGroupsState,
  setSceneDefinitions,
  setSelectedProjectId,
  setSequencerBpm,
  setSequencerClockStepLength,
  setSequencerPanelMode,
  setSongArrangement,
  setSongSceneDraftId,
  stopAllLoopBufferSources,
  stopAllMetronomeSources,
  stopAllOneShotBufferSources,
}: UseApplyProjectStateInput) => {
  return useCallback(
    (
      candidateProjectState: Partial<ProjectState>,
      options?: ApplyProjectStateOptions
    ) => {
      const hasPadGroups =
        Boolean(candidateProjectState.padGroups) &&
        typeof candidateProjectState.padGroups === "object";

      const nextPadGroups: PadGroupsState = PAD_GROUP_IDS.reduce((groupsState, groupId) => {
        if (hasPadGroups) {
          const candidateGroupState = candidateProjectState.padGroups?.[groupId];
          groupsState[groupId] = normalizePadGroupState(candidateGroupState);
          return groupsState;
        }

        if (groupId === DEFAULT_ACTIVE_PAD_GROUP_ID) {
          groupsState[groupId] = normalizePadGroupState({
            padVolumes: candidateProjectState.padVolumes,
            padNames: candidateProjectState.padNames,
            padPolyphony: candidateProjectState.padPolyphony,
            padLoopEnabled: candidateProjectState.padLoopEnabled,
            padRowMuted: candidateProjectState.padRowMuted,
            padSampleIds: candidateProjectState.padSampleIds,
            padSampleSettings: candidateProjectState.padSampleSettings,
            padStepSequence: candidateProjectState.padStepSequence,
            padStepOctaves: candidateProjectState.padStepOctaves as PadStepOctaves | undefined,
            padStepLength: candidateProjectState.padStepLength as PadStepLength | undefined,
            sequencerPatterns: candidateProjectState.sequencerPatterns,
            activePatternId: candidateProjectState.activePatternId,
          });
          return groupsState;
        }

        groupsState[groupId] = createDefaultPadGroupState();
        return groupsState;
      }, {} as PadGroupsState);

      const requestedActivePadGroupId = isPadGroupId(candidateProjectState.activePadGroupId)
        ? candidateProjectState.activePadGroupId
        : DEFAULT_ACTIVE_PAD_GROUP_ID;
      const nextActivePadGroup =
        nextPadGroups[requestedActivePadGroupId] ??
        nextPadGroups[DEFAULT_ACTIVE_PAD_GROUP_ID] ??
        createDefaultPadGroupState();
      const nextSceneDefinitions = normalizeSceneDefinitions(
        candidateProjectState.sceneDefinitions,
        nextPadGroups
      );
      const nextActiveSceneId =
        typeof candidateProjectState.activeSceneId === "string" &&
        nextSceneDefinitions.some(
          (sceneDefinition) => sceneDefinition.id === candidateProjectState.activeSceneId
        )
          ? candidateProjectState.activeSceneId
          : nextSceneDefinitions[0].id;
      const nextSongArrangement = normalizeSongArrangement(
        candidateProjectState.songArrangement,
        nextSceneDefinitions
      );
      const nextSequencerPanelMode = normalizeSequencerPanelMode(
        candidateProjectState.sequencerPanelMode
      );

      if (!options?.preserveTransport) {
        cancelCountIn();
        stopAllLoopBufferSources();
        stopAllOneShotBufferSources();
        stopAllMetronomeSources();
        currentTickRef.current = 0;
        setCurrentStep(0);
        setIsPlaying(false);
        setIsRecording(false);
      }

      if (options?.selectedProjectId !== undefined) {
        setSelectedProjectId(options.selectedProjectId);
      }

      setMasterVolume(
        Math.max(0, Math.min(100, Number(candidateProjectState.masterVolume ?? DEFAULT_PAD_VOLUME)))
      );
      setSequencerPanelMode(nextSequencerPanelMode);
      setPadGroupsState(nextPadGroups);
      setActivePadGroupId(requestedActivePadGroupId);
      applyPadGroupState(nextActivePadGroup);
      setSceneDefinitions(nextSceneDefinitions);
      setActiveSceneId(nextActiveSceneId);
      setSongArrangement(nextSongArrangement);
      setSongSceneDraftId(nextActiveSceneId);
      if (!options?.preserveTransport) {
        setCurrentSongEntryIndex(null);
        setCurrentSongEntryProgress(null);
      }
      setSequencerBpm(
        clampSequencerBpm(Number(candidateProjectState.sequencerBpm ?? DEFAULT_SEQUENCER_BPM))
      );
      setSequencerClockStepLength(
        isSequencerStepLength(candidateProjectState.sequencerClockStepLength)
          ? candidateProjectState.sequencerClockStepLength
          : BASE_SEQUENCER_STEP_LENGTH
      );
      setIsMetronomeEnabled(Boolean(candidateProjectState.isMetronomeEnabled));
    },
    [
      applyPadGroupState,
      cancelCountIn,
      currentTickRef,
      setActivePadGroupId,
      setActiveSceneId,
      setCurrentSongEntryIndex,
      setCurrentSongEntryProgress,
      setCurrentStep,
      setIsMetronomeEnabled,
      setIsPlaying,
      setIsRecording,
      setMasterVolume,
      setPadGroupsState,
      setSceneDefinitions,
      setSelectedProjectId,
      setSequencerBpm,
      setSequencerClockStepLength,
      setSequencerPanelMode,
      setSongArrangement,
      setSongSceneDraftId,
      stopAllLoopBufferSources,
      stopAllMetronomeSources,
      stopAllOneShotBufferSources,
    ]
  );
};
