import { useCallback } from "react";
import type {
PadGroupId,
PadGroupState,
PadGroupsState,
PadSampleIds,
PadSampleSettingsMap
} from "../../DrumpadController.types";
import { normalizePadSampleSettings } from "../../DrumpadController.utilities";
import {
clonePadGroupState,
clonePadStepLength,
clonePadStepOctaves,
clonePadStepSequence,
cloneSequencerPatterns,
createDefaultPadGroupState,
} from "../../helpers/pattern";

import type {
UsePadGroupStateHandlersInput,
} from "./DrumpadControllerPadGroupState.types";

export const usePadGroupStateHandlers = ({
  activePadGroupId,
  activePadGroupIdRef,
  buildPadGroupStateSnapshot,
  cancelCountIn,
  clearScheduledTickVisualTimeouts,
  currentTickRef,
  ensureSampleBuffer,
  normalizePadGroupState,
  padGroupsState,
  sampleAssetsById,
  setActivePadGroupId,
  setActivePatternId,
  setCurrentStep,
  setEditingPadId,
  setIsPlaying,
  setIsRecording,
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
  setSequencerPatterns,
  stopAllLoopBufferSources,
  stopAllMetronomeSources,
  stopAllOneShotBufferSources,
  stopPreviewBufferSource,
}: UsePadGroupStateHandlersInput) => {
  const warmAssignedSamples = useCallback(
    (sampleIds: PadSampleIds) => {
      const uniqueSampleIds = new Set(
        Object.values(sampleIds)
          .map((sampleId) => sampleId.trim())
          .filter((sampleId) => Boolean(sampleId))
      );

      uniqueSampleIds.forEach((sampleId) => {
        const sample = sampleAssetsById.get(sampleId);
        if (!sample) {
          return;
        }

        void ensureSampleBuffer(sample).catch(() => {
          // Ignore warmup failures; manual trigger can retry.
        });
      });
    },
    [ensureSampleBuffer, sampleAssetsById]
  );

  const applyPadGroupState = useCallback(
    (candidatePadGroupState?: Partial<PadGroupState>): PadGroupState => {
      const normalizedPadGroupState = normalizePadGroupState(candidatePadGroupState);
      setPadVolumes({ ...normalizedPadGroupState.padVolumes });
      setPadNames({ ...normalizedPadGroupState.padNames });
      setPadPolyphony({ ...normalizedPadGroupState.padPolyphony });
      setPadLoopEnabled({ ...normalizedPadGroupState.padLoopEnabled });
      setPadRowMuted({ ...normalizedPadGroupState.padRowMuted });
      setPadSampleIds({ ...normalizedPadGroupState.padSampleIds });
      setPadSampleSettings(
        Object.fromEntries(
          Object.entries(normalizedPadGroupState.padSampleSettings).map(([padId, settings]) => [
            Number(padId),
            normalizePadSampleSettings(settings),
          ])
        ) as PadSampleSettingsMap
      );
      setSequencerPatterns(cloneSequencerPatterns(normalizedPadGroupState.sequencerPatterns));
      setActivePatternId(normalizedPadGroupState.activePatternId);
      setPadStepSequence(clonePadStepSequence(normalizedPadGroupState.padStepSequence));
      setPadStepOctaves(clonePadStepOctaves(normalizedPadGroupState.padStepOctaves));
      setPadStepLength(clonePadStepLength(normalizedPadGroupState.padStepLength));
      warmAssignedSamples(normalizedPadGroupState.padSampleIds);

      return normalizedPadGroupState;
    },
    [
      normalizePadGroupState,
      setActivePatternId,
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
      setSequencerPatterns,
      warmAssignedSamples,
    ]
  );

  const handleSelectPadGroup = useCallback(
    (groupId: PadGroupId) => {
      if (groupId === activePadGroupId) {
        return;
      }

      cancelCountIn();
      stopAllLoopBufferSources();
      stopAllOneShotBufferSources();
      stopAllMetronomeSources();
      stopPreviewBufferSource();
      clearScheduledTickVisualTimeouts();
      setIsPlaying(false);
      setIsRecording(false);
      currentTickRef.current = 0;
      setCurrentStep(0);
      setEditingPadId(null);
      setSampleAssignPadId(null);

      const currentPadGroupSnapshot = buildPadGroupStateSnapshot();
      const nextPadGroups = {
        ...padGroupsState,
        [activePadGroupId]: clonePadGroupState(currentPadGroupSnapshot),
      } as PadGroupsState;
      const targetPadGroup = nextPadGroups[groupId] ?? createDefaultPadGroupState();
      nextPadGroups[groupId] = clonePadGroupState(targetPadGroup);

      setPadGroupsState(nextPadGroups);
      activePadGroupIdRef.current = groupId;
      setActivePadGroupId(groupId);
      applyPadGroupState(targetPadGroup);
    },
    [
      activePadGroupId,
      activePadGroupIdRef,
      applyPadGroupState,
      buildPadGroupStateSnapshot,
      cancelCountIn,
      clearScheduledTickVisualTimeouts,
      currentTickRef,
      padGroupsState,
      setActivePadGroupId,
      setCurrentStep,
      setEditingPadId,
      setIsPlaying,
      setIsRecording,
      setPadGroupsState,
      setSampleAssignPadId,
      stopAllLoopBufferSources,
      stopAllMetronomeSources,
      stopAllOneShotBufferSources,
      stopPreviewBufferSource,
    ]
  );

  return {
    applyPadGroupState,
    handleSelectPadGroup,
    warmAssignedSamples,
  };
};
