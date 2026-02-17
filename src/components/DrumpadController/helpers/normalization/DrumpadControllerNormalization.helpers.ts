import { createSavedKitId } from "../../../KitManager/KitManager.utilities";
import {
  DEFAULT_ROW_STEP_LENGTH,
  STEPS_IN_SEQUENCE,
} from "../../../StepSequencer/StepSequencer.utilities";
import {
  createInitialPadLoopEnabled,
  createInitialPadNames,
  createInitialPadPolyphony,
  createInitialPadRowMuted,
  createInitialPadSampleSettings,
  createInitialPadStepLength,
  createInitialPadStepOctaves,
  createInitialPadStepSequence,
  createInitialPadVolumes,
  DRUM_PADS,
  normalizePadSampleSettings,
} from "../../DrumpadController.utilities";
import { DEFAULT_SEQUENCER_PANEL_MODE, PAD_GROUP_IDS } from "../../constants";
import {
  clonePadStepLength,
  clonePadStepOctaves,
  clonePadStepSequence,
  cloneSequencerPatterns,
  getNormalizedStepOctaveSemitoneOffset,
  isSequencerStepLength,
} from "../pattern";
import { createDefaultSceneDefinition, isSequencerPanelMode } from "../scene";
import type {
  PadGroupState,
  PadGroupsState,
  PadSampleIds,
  PadSampleSettingsMap,
  PadStepLength,
  PadStepOctaves,
  PadStepSequence,
  SceneDefinition,
  ScenePatternSelection,
  SequencerPanelMode,
  SequencerPattern,
  SongArrangementEntry,
} from "../../DrumpadController.types";

export const normalizePadStepSequence = (candidate: PadStepSequence): PadStepSequence => {
  const defaults = createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE);

  DRUM_PADS.forEach((pad) => {
    const candidateSteps = candidate[pad.id];
    if (!Array.isArray(candidateSteps)) {
      return;
    }

    defaults[pad.id] = Array.from({ length: STEPS_IN_SEQUENCE }, (_, index) =>
      Boolean(candidateSteps[index])
    );
  });

  return defaults;
};

export const normalizePadStepOctaves = (candidate: PadStepOctaves): PadStepOctaves => {
  const defaults = createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE);

  DRUM_PADS.forEach((pad) => {
    const candidateStepOctaves = candidate[pad.id];
    if (!Array.isArray(candidateStepOctaves)) {
      return;
    }

    defaults[pad.id] = Array.from({ length: STEPS_IN_SEQUENCE }, (_, index) =>
      getNormalizedStepOctaveSemitoneOffset(candidateStepOctaves[index])
    );
  });

  return defaults;
};

export const normalizePadStepLength = (candidate: PadStepLength): PadStepLength => {
  const defaults = createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH);

  DRUM_PADS.forEach((pad) => {
    const candidateStepLength = candidate[pad.id];
    if (isSequencerStepLength(candidateStepLength)) {
      defaults[pad.id] = candidateStepLength;
    }
  });

  return defaults;
};

export const normalizePadSampleSettingsMap = (
  candidate?: Partial<PadSampleSettingsMap>
): PadSampleSettingsMap => {
  const defaults = createInitialPadSampleSettings(DRUM_PADS);

  DRUM_PADS.forEach((pad) => {
    defaults[pad.id] = normalizePadSampleSettings(candidate?.[pad.id]);
  });

  return defaults;
};

export const normalizeSequencerPatterns = (candidatePatterns: unknown): SequencerPattern[] => {
  if (!Array.isArray(candidatePatterns)) {
    return [];
  }

  return candidatePatterns
    .map((candidatePattern, index) => {
      if (!candidatePattern || typeof candidatePattern !== "object") {
        return null;
      }

      const patternRecord = candidatePattern as Record<string, unknown>;
      const patternName =
        typeof patternRecord.name === "string" && patternRecord.name.trim()
          ? patternRecord.name.trim()
          : `Pattern ${index + 1}`;
      const patternId =
        typeof patternRecord.id === "string" && patternRecord.id.trim()
          ? patternRecord.id
          : createSavedKitId();

      return {
        id: patternId,
        name: patternName,
        padStepSequence: normalizePadStepSequence(
          (patternRecord.padStepSequence as PadStepSequence) ?? ({} as PadStepSequence)
        ),
        padStepOctaves: normalizePadStepOctaves(
          (patternRecord.padStepOctaves as PadStepOctaves) ?? ({} as PadStepOctaves)
        ),
        padStepLength: normalizePadStepLength(
          (patternRecord.padStepLength as PadStepLength) ?? ({} as PadStepLength)
        ),
      } as SequencerPattern;
    })
    .filter((pattern): pattern is SequencerPattern => Boolean(pattern));
};

export const normalizePadGroupState = (
  candidatePadGroupState?: Partial<PadGroupState>
): PadGroupState => {
  const defaultsPadVolumes = createInitialPadVolumes(DRUM_PADS);
  const defaultsPadNames = createInitialPadNames(DRUM_PADS);
  const defaultsPadPolyphony = createInitialPadPolyphony(DRUM_PADS);
  const defaultsPadLoopEnabled = createInitialPadLoopEnabled(DRUM_PADS);
  const defaultsPadRowMuted = createInitialPadRowMuted(DRUM_PADS);
  const defaultsPadSampleSettings = createInitialPadSampleSettings(DRUM_PADS);
  const defaultsPadStepSequence = createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE);
  const defaultsPadStepOctaves = createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE);
  const defaultsPadStepLength = createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH);
  const nextPadSampleIds = {
    ...(candidatePadGroupState?.padSampleIds ?? {}),
  } as PadSampleIds;

  const normalizedPatterns = normalizeSequencerPatterns(candidatePadGroupState?.sequencerPatterns);
  const fallbackPattern: SequencerPattern = {
    id: createSavedKitId(),
    name: "Pattern 1",
    padStepSequence: normalizePadStepSequence({
      ...defaultsPadStepSequence,
      ...(candidatePadGroupState?.padStepSequence ?? {}),
    }),
    padStepOctaves: normalizePadStepOctaves({
      ...defaultsPadStepOctaves,
      ...(candidatePadGroupState?.padStepOctaves ?? {}),
    }),
    padStepLength: normalizePadStepLength({
      ...defaultsPadStepLength,
      ...(candidatePadGroupState?.padStepLength ?? {}),
    }),
  };
  const nextPatterns = normalizedPatterns.length > 0 ? normalizedPatterns : [fallbackPattern];
  const nextActivePattern =
    nextPatterns.find((pattern) => pattern.id === candidatePadGroupState?.activePatternId) ??
    nextPatterns[0];

  return {
    padVolumes: {
      ...defaultsPadVolumes,
      ...(candidatePadGroupState?.padVolumes ?? {}),
    },
    padNames: {
      ...defaultsPadNames,
      ...(candidatePadGroupState?.padNames ?? {}),
    },
    padPolyphony: {
      ...defaultsPadPolyphony,
      ...(candidatePadGroupState?.padPolyphony ?? {}),
    },
    padLoopEnabled: {
      ...defaultsPadLoopEnabled,
      ...(candidatePadGroupState?.padLoopEnabled ?? {}),
    },
    padRowMuted: {
      ...defaultsPadRowMuted,
      ...(candidatePadGroupState?.padRowMuted ?? {}),
    },
    padSampleIds: nextPadSampleIds,
    padSampleSettings: normalizePadSampleSettingsMap({
      ...defaultsPadSampleSettings,
      ...(candidatePadGroupState?.padSampleSettings ?? {}),
    }),
    padStepSequence: clonePadStepSequence(nextActivePattern.padStepSequence),
    padStepOctaves: clonePadStepOctaves(nextActivePattern.padStepOctaves),
    padStepLength: clonePadStepLength(nextActivePattern.padStepLength),
    sequencerPatterns: cloneSequencerPatterns(nextPatterns),
    activePatternId: nextActivePattern.id,
  };
};

export const normalizeSequencerPanelMode = (candidateMode: unknown): SequencerPanelMode => {
  return isSequencerPanelMode(candidateMode)
    ? candidateMode
    : DEFAULT_SEQUENCER_PANEL_MODE;
};

export const normalizeSceneDefinitions = (
  candidateScenes: unknown,
  sourcePadGroups: PadGroupsState
): SceneDefinition[] => {
  const candidateSceneArray = Array.isArray(candidateScenes) ? candidateScenes : [];

  const nextScenes = candidateSceneArray
    .map((candidateScene, index) => {
      if (!candidateScene || typeof candidateScene !== "object") {
        return null;
      }

      const sceneRecord = candidateScene as Record<string, unknown>;
      const sceneName =
        typeof sceneRecord.name === "string" && sceneRecord.name.trim()
          ? sceneRecord.name.trim()
          : `Scene ${index + 1}`;
      const sceneId =
        typeof sceneRecord.id === "string" && sceneRecord.id.trim()
          ? sceneRecord.id.trim()
          : createSavedKitId();

      const candidateSelection =
        sceneRecord.selectedPatternIdsByGroup &&
        typeof sceneRecord.selectedPatternIdsByGroup === "object"
          ? (sceneRecord.selectedPatternIdsByGroup as Partial<ScenePatternSelection>)
          : ({} as Partial<ScenePatternSelection>);

      const selectedPatternIdsByGroup = PAD_GROUP_IDS.reduce((selection, groupId) => {
        const groupState = sourcePadGroups[groupId];
        const candidatePatternId = candidateSelection[groupId];
        const hasCandidatePattern =
          typeof candidatePatternId === "string" &&
          groupState.sequencerPatterns.some((pattern) => pattern.id === candidatePatternId);

        selection[groupId] = hasCandidatePattern ? candidatePatternId : null;
        return selection;
      }, {} as ScenePatternSelection);

      return {
        id: sceneId,
        name: sceneName,
        selectedPatternIdsByGroup,
      } satisfies SceneDefinition;
    })
    .filter((sceneDefinition): sceneDefinition is SceneDefinition => Boolean(sceneDefinition));

  if (nextScenes.length > 0) {
    return nextScenes;
  }

  return [createDefaultSceneDefinition(sourcePadGroups, 1)];
};

export const normalizeSongArrangement = (
  candidateSongArrangement: unknown,
  availableScenes: SceneDefinition[]
): SongArrangementEntry[] => {
  if (!Array.isArray(candidateSongArrangement) || !availableScenes.length) {
    return [];
  }

  const availableSceneIds = new Set(availableScenes.map((sceneDefinition) => sceneDefinition.id));

  return candidateSongArrangement
    .map((candidateSongEntry) => {
      if (!candidateSongEntry || typeof candidateSongEntry !== "object") {
        return null;
      }

      const entryRecord = candidateSongEntry as Record<string, unknown>;
      const sceneId =
        typeof entryRecord.sceneId === "string" && entryRecord.sceneId.trim()
          ? entryRecord.sceneId.trim()
          : "";
      if (!availableSceneIds.has(sceneId)) {
        return null;
      }

      const songEntryId =
        typeof entryRecord.id === "string" && entryRecord.id.trim()
          ? entryRecord.id.trim()
          : createSavedKitId();

      return {
        id: songEntryId,
        sceneId,
      } satisfies SongArrangementEntry;
    })
    .filter((songEntry): songEntry is SongArrangementEntry => Boolean(songEntry));
};
