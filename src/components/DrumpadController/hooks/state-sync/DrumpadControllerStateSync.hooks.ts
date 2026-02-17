import { useEffect } from "react";
import { normalizeSceneDefinitions } from "../../helpers/normalization";
import { clonePadStepLength,clonePadStepOctaves,clonePadStepSequence } from "../../helpers/pattern";
import { areSceneDefinitionsEqual } from "../../helpers/scene";

import type {
UseStateSyncEffectsInput,
} from "./DrumpadControllerStateSync.types";

export const useStateSyncEffects = ({
  activePadGroupId,
  activePatternId,
  activeSceneId,
  buildPadGroupStateSnapshot,
  livePadGroupsState,
  padSampleIds,
  padStepLength,
  padStepOctaves,
  padStepSequence,
  sceneDefinitions,
  sequencerPatterns,
  setActivePatternId,
  setActiveSceneId,
  setPadGroupsState,
  setPadStepLength,
  setPadStepOctaves,
  setPadStepSequence,
  setSceneDefinitions,
  setSequencerPatterns,
  setSongSceneDraftId,
  songSceneDraftId,
  warmAssignedSamples,
}: UseStateSyncEffectsInput) => {
  useEffect(() => {
    if (!activePatternId) {
      return;
    }

    setSequencerPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id === activePatternId
          ? {
              ...pattern,
              padStepSequence: clonePadStepSequence(padStepSequence),
              padStepOctaves: clonePadStepOctaves(padStepOctaves),
              padStepLength: clonePadStepLength(padStepLength),
            }
          : pattern
      )
    );
  }, [activePatternId, padStepLength, padStepOctaves, padStepSequence, setSequencerPatterns]);

  useEffect(() => {
    if (!sequencerPatterns.length) {
      return;
    }

    const activePattern = sequencerPatterns.find((pattern) => pattern.id === activePatternId);
    if (activePattern) {
      return;
    }

    const fallbackPattern = sequencerPatterns[0];
    setActivePatternId(fallbackPattern.id);
    setPadStepSequence(clonePadStepSequence(fallbackPattern.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(fallbackPattern.padStepOctaves));
    setPadStepLength(clonePadStepLength(fallbackPattern.padStepLength));
  }, [
    activePatternId,
    sequencerPatterns,
    setActivePatternId,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
  ]);

  useEffect(() => {
    if (!sceneDefinitions.length) {
      return;
    }

    if (!sceneDefinitions.some((sceneDefinition) => sceneDefinition.id === activeSceneId)) {
      setActiveSceneId(sceneDefinitions[0].id);
    }
  }, [activeSceneId, sceneDefinitions, setActiveSceneId]);

  useEffect(() => {
    if (!sceneDefinitions.length) {
      return;
    }

    if (!sceneDefinitions.some((sceneDefinition) => sceneDefinition.id === songSceneDraftId)) {
      setSongSceneDraftId(sceneDefinitions[0].id);
    }
  }, [sceneDefinitions, setSongSceneDraftId, songSceneDraftId]);

  useEffect(() => {
    setSceneDefinitions((previousScenes) => {
      const normalizedScenes = normalizeSceneDefinitions(previousScenes, livePadGroupsState);
      return areSceneDefinitionsEqual(previousScenes, normalizedScenes)
        ? previousScenes
        : normalizedScenes;
    });
  }, [livePadGroupsState, setSceneDefinitions]);

  useEffect(() => {
    const currentPadGroupSnapshot = buildPadGroupStateSnapshot();
    setPadGroupsState((previous) => ({
      ...previous,
      [activePadGroupId]: currentPadGroupSnapshot,
    }));
  }, [activePadGroupId, buildPadGroupStateSnapshot, setPadGroupsState]);

  useEffect(() => {
    if (!Object.keys(padSampleIds).length) {
      return;
    }

    warmAssignedSamples(padSampleIds);
  }, [padSampleIds, warmAssignedSamples]);
};

