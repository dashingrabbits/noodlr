import { useMemo } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import { applySampleMetadataOverride,buildSearchTextForSampleAsset } from "../../../../integrations/samples/sample.utilities";
import { formatSemitoneOffsetAsOctaves,OCTAVE_TRANSPOSE_SEMITONES } from "../../../KeyboardTranspose/KeyboardTranspose.utilities";
import type { ProjectOption } from "../../../MasterControls";
import {
createEmptyStepSequence,
DEFAULT_ROW_STEP_LENGTH,
getShortestStepLength,
getStepLengthTickMultiplier,
STEPS_IN_SEQUENCE,
type SequencerStepLength,
} from "../../../StepSequencer/StepSequencer.utilities";
import { EMPTY_STEP_OCTAVE_SEQUENCE,PAD_GROUP_IDS } from "../../constants";
import type {
PadAssignedSamples,
PadGroupsState
} from "../../DrumpadController.types";
import { createKeyboardPadMap,DRUM_PADS } from "../../DrumpadController.utilities";
import {
clonePadGroupState,
createDefaultPadGroupState,
isSequencerStepLength,
} from "../../helpers/pattern";
import { useTransportTiming } from "../transport-timing";

import type {
UseDerivedStateInput,
UseDerivedStateResult,
} from "./DrumpadControllerDerivedState.types";

export const useDerivedState = ({
  activePadGroupId,
  activeSceneId,
  buildPadGroupStateSnapshot,
  currentStep,
  editingPadId,
  heldTransposeSemitoneOffset,
  importedSampleAssets,
  padGroupsState,
  padNames,
  padRowMuted,
  padSampleIds,
  padStepLength,
  padStepOctaves,
  padStepSequence,
  sampleAssets,
  sampleMetadataOverrides,
  sampleSearch,
  sampleAssignPadId,
  savedProjects,
  sceneDefinitions,
  selectedProjectId,
  sequencerClockStepLength,
  sequencerPatterns,
  songArrangement,
}: UseDerivedStateInput): UseDerivedStateResult => {
  const keyboardPadMap = useMemo(() => createKeyboardPadMap(DRUM_PADS), []);

  const combinedSampleAssets = useMemo(
    () => [...sampleAssets, ...importedSampleAssets],
    [importedSampleAssets, sampleAssets]
  );

  const effectiveSampleAssets = useMemo(() => {
    return combinedSampleAssets.map((sample) =>
      applySampleMetadataOverride(sample, sampleMetadataOverrides[sample.id])
    );
  }, [combinedSampleAssets, sampleMetadataOverrides]);

  const sampleAssetsById = useMemo(() => {
    const map = new Map<string, SampleAsset>();
    effectiveSampleAssets.forEach((sample) => map.set(sample.id, sample));
    return map;
  }, [effectiveSampleAssets]);

  const filteredSampleAssets = useMemo(() => {
    const normalizedQuery = sampleSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return effectiveSampleAssets;
    }

    return effectiveSampleAssets.filter((sample) =>
      buildSearchTextForSampleAsset(sample).includes(normalizedQuery)
    );
  }, [effectiveSampleAssets, sampleSearch]);

  const heldTransposeOctaveOffsetLabel = useMemo(() => {
    const formattedOffset = formatSemitoneOffsetAsOctaves(
      heldTransposeSemitoneOffset,
      OCTAVE_TRANSPOSE_SEMITONES
    );
    return formattedOffset ? `${formattedOffset} oct` : "Off";
  }, [heldTransposeSemitoneOffset]);

  const padAssignedSamples = useMemo<PadAssignedSamples>(() => {
    const assignments: PadAssignedSamples = {};
    Object.entries(padSampleIds).forEach(([padIdRaw, sampleId]) => {
      const padId = Number(padIdRaw);
      assignments[padId] = sampleId ? sampleAssetsById.get(sampleId) ?? null : null;
    });
    return assignments;
  }, [padSampleIds, sampleAssetsById]);

  const sequencerRows = useMemo(() => {
    return DRUM_PADS.filter((pad) => Boolean(padAssignedSamples[pad.id])).map((pad) => ({
      padId: pad.id,
      padLabel: padNames[pad.id] ?? pad.label,
      padKey: pad.key,
      sampleName: padAssignedSamples[pad.id]?.name ?? "",
      isMuted: padRowMuted[pad.id] ?? false,
      stepLength: (padStepLength[pad.id] ?? DEFAULT_ROW_STEP_LENGTH) as SequencerStepLength,
      steps: padStepSequence[pad.id] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE),
      stepOctaves: padStepOctaves[pad.id] ?? EMPTY_STEP_OCTAVE_SEQUENCE,
    }));
  }, [padAssignedSamples, padNames, padRowMuted, padStepLength, padStepOctaves, padStepSequence]);

  const sequencerEngineStepLength = useMemo(() => {
    const stepLengths = new Set<SequencerStepLength>([sequencerClockStepLength]);

    PAD_GROUP_IDS.forEach((groupId) => {
      const patterns =
        groupId === activePadGroupId
          ? sequencerPatterns
          : (padGroupsState[groupId]?.sequencerPatterns ?? []);
      patterns.forEach((pattern) => {
        Object.values(pattern.padStepLength).forEach((stepLength) => {
          if (isSequencerStepLength(stepLength)) {
            stepLengths.add(stepLength);
          }
        });
      });
    });

    return getShortestStepLength(Array.from(stepLengths));
  }, [activePadGroupId, padGroupsState, sequencerClockStepLength, sequencerPatterns]);

  const currentMainStep = useMemo(() => {
    const ticksPerMainStep = getStepLengthTickMultiplier(
      sequencerClockStepLength,
      sequencerEngineStepLength
    );
    return Math.floor(currentStep / ticksPerMainStep);
  }, [currentStep, sequencerClockStepLength, sequencerEngineStepLength]);

  const basePatternLoopTicks = useMemo(() => {
    return (
      getStepLengthTickMultiplier(sequencerClockStepLength, sequencerEngineStepLength) *
      STEPS_IN_SEQUENCE
    );
  }, [sequencerClockStepLength, sequencerEngineStepLength]);

  const patternOptions = useMemo(() => {
    return sequencerPatterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
    }));
  }, [sequencerPatterns]);

  const projectOptions = useMemo<ProjectOption[]>(() => {
    return savedProjects.map((savedProject) => ({
      id: savedProject.id,
      name: savedProject.name,
    }));
  }, [savedProjects]);

  const selectedProject = useMemo(() => {
    return savedProjects.find((savedProject) => savedProject.id === selectedProjectId) ?? null;
  }, [savedProjects, selectedProjectId]);

  const activeScene = useMemo(() => {
    if (!sceneDefinitions.length) {
      return null;
    }

    return (
      sceneDefinitions.find((sceneDefinition) => sceneDefinition.id === activeSceneId) ??
      sceneDefinitions[0]
    );
  }, [activeSceneId, sceneDefinitions]);

  const sceneDefinitionsById = useMemo(() => {
    return new Map(sceneDefinitions.map((sceneDefinition) => [sceneDefinition.id, sceneDefinition]));
  }, [sceneDefinitions]);

  const editingPad = useMemo(() => {
    if (editingPadId === null) {
      return null;
    }

    return DRUM_PADS.find((pad) => pad.id === editingPadId) ?? null;
  }, [editingPadId]);

  const sampleAssignPad = useMemo(() => {
    if (sampleAssignPadId === null) {
      return null;
    }

    return DRUM_PADS.find((pad) => pad.id === sampleAssignPadId) ?? null;
  }, [sampleAssignPadId]);

  const editingPadSampleId = useMemo(() => {
    if (!editingPad) {
      return "";
    }

    return padSampleIds[editingPad.id] ?? "";
  }, [editingPad, padSampleIds]);

  const editingPadSample = useMemo(() => {
    if (!editingPadSampleId) {
      return null;
    }

    return sampleAssetsById.get(editingPadSampleId) ?? null;
  }, [editingPadSampleId, sampleAssetsById]);

  const livePadGroupsState = useMemo(() => {
    const currentPadGroupSnapshot = buildPadGroupStateSnapshot();
    return PAD_GROUP_IDS.reduce((groupsState, groupId) => {
      const sourceState =
        groupId === activePadGroupId
          ? currentPadGroupSnapshot
          : padGroupsState[groupId] ?? createDefaultPadGroupState();
      groupsState[groupId] = clonePadGroupState(sourceState);
      return groupsState;
    }, {} as PadGroupsState);
  }, [activePadGroupId, buildPadGroupStateSnapshot, padGroupsState]);

  const { activeSceneDurationTicks, songArrangementTiming } = useTransportTiming({
    activeScene,
    basePatternLoopTicks,
    livePadGroupsState,
    sceneDefinitions,
    sequencerEngineStepLength,
    songArrangement,
  });

  return {
    activeScene,
    activeSceneDurationTicks,
    basePatternLoopTicks,
    combinedSampleAssets,
    currentMainStep,
    editingPad,
    editingPadSample,
    editingPadSampleId,
    effectiveSampleAssets,
    filteredSampleAssets,
    heldTransposeOctaveOffsetLabel,
    keyboardPadMap,
    livePadGroupsState,
    padAssignedSamples,
    patternOptions,
    projectOptions,
    sampleAssignPad,
    sampleAssetsById,
    sceneDefinitionsById,
    selectedProject,
    sequencerEngineStepLength,
    sequencerRows,
    songArrangementTiming,
  };
};
