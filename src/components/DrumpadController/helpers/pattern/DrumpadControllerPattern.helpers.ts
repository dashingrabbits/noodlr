import {
  DEFAULT_ROW_STEP_LENGTH,
  STEPS_IN_SEQUENCE,
  type SequencerStepLength,
} from "../../../StepSequencer/StepSequencer.utilities";
import {
  MAX_TRANSPOSE_STEP_DIGIT,
  normalizeTransposeSemitoneOffset,
  TRANSPOSE_STEP_SEMITONES,
} from "../../../KeyboardTranspose/KeyboardTranspose.utilities";
import { createSavedKitId } from "../../../KitManager/KitManager.utilities";
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
import { PAD_GROUP_IDS, SEQUENCER_STEP_LENGTH_OPTIONS } from "../../constants";
import type {
  PadGroupId,
  PadGroupState,
  PadGroupsState,
  PadSampleSettingsMap,
  PadStepLength,
  PadStepOctaves,
  PadStepSequence,
  SequencerPattern,
} from "../../DrumpadController.types";

export const isSequencerStepLength = (value: unknown): value is SequencerStepLength => {
  return (
    typeof value === "string" &&
    SEQUENCER_STEP_LENGTH_OPTIONS.includes(value as SequencerStepLength)
  );
};

export const clonePadStepSequence = (padStepSequence: PadStepSequence): PadStepSequence => {
  return Object.fromEntries(
    Object.entries(padStepSequence).map(([padId, steps]) => [padId, [...steps]])
  ) as PadStepSequence;
};

export const clonePadStepOctaves = (padStepOctaves: PadStepOctaves): PadStepOctaves => {
  return Object.fromEntries(
    Object.entries(padStepOctaves).map(([padId, stepOctaves]) => [padId, [...stepOctaves]])
  ) as PadStepOctaves;
};

export const clonePadStepLength = (padStepLength: PadStepLength): PadStepLength => {
  return { ...padStepLength };
};

export const getNormalizedStepOctaveSemitoneOffset = (candidateValue: unknown): number => {
  return normalizeTransposeSemitoneOffset(
    candidateValue,
    TRANSPOSE_STEP_SEMITONES,
    MAX_TRANSPOSE_STEP_DIGIT
  );
};

export const createDefaultSequencerPattern = (): SequencerPattern => {
  return {
    id: createSavedKitId(),
    name: "Pattern 1",
    padStepSequence: createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE),
    padStepOctaves: createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE),
    padStepLength: createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH),
  };
};

export const cloneSequencerPattern = (pattern: SequencerPattern): SequencerPattern => {
  return {
    ...pattern,
    padStepSequence: clonePadStepSequence(pattern.padStepSequence),
    padStepOctaves: clonePadStepOctaves(pattern.padStepOctaves),
    padStepLength: clonePadStepLength(pattern.padStepLength),
  };
};

export const cloneSequencerPatterns = (patterns: SequencerPattern[]): SequencerPattern[] => {
  return patterns.map((pattern) => cloneSequencerPattern(pattern));
};

export const createDefaultPadGroupState = (): PadGroupState => {
  const initialPattern = createDefaultSequencerPattern();
  return {
    padVolumes: createInitialPadVolumes(DRUM_PADS),
    padNames: createInitialPadNames(DRUM_PADS),
    padPolyphony: createInitialPadPolyphony(DRUM_PADS),
    padLoopEnabled: createInitialPadLoopEnabled(DRUM_PADS),
    padRowMuted: createInitialPadRowMuted(DRUM_PADS),
    padSampleIds: {},
    padSampleSettings: createInitialPadSampleSettings(DRUM_PADS),
    padStepSequence: clonePadStepSequence(initialPattern.padStepSequence),
    padStepOctaves: clonePadStepOctaves(initialPattern.padStepOctaves),
    padStepLength: clonePadStepLength(initialPattern.padStepLength),
    sequencerPatterns: [cloneSequencerPattern(initialPattern)],
    activePatternId: initialPattern.id,
  };
};

export const clonePadGroupState = (padGroupState: PadGroupState): PadGroupState => {
  return {
    padVolumes: { ...padGroupState.padVolumes },
    padNames: { ...padGroupState.padNames },
    padPolyphony: { ...padGroupState.padPolyphony },
    padLoopEnabled: { ...padGroupState.padLoopEnabled },
    padRowMuted: { ...padGroupState.padRowMuted },
    padSampleIds: { ...padGroupState.padSampleIds },
    padSampleSettings: Object.fromEntries(
      Object.entries(padGroupState.padSampleSettings).map(([padId, settings]) => [
        Number(padId),
        normalizePadSampleSettings(settings),
      ])
    ) as PadSampleSettingsMap,
    padStepSequence: clonePadStepSequence(padGroupState.padStepSequence),
    padStepOctaves: clonePadStepOctaves(padGroupState.padStepOctaves),
    padStepLength: clonePadStepLength(padGroupState.padStepLength),
    sequencerPatterns: cloneSequencerPatterns(padGroupState.sequencerPatterns),
    activePatternId: padGroupState.activePatternId,
  };
};

export const createInitialPadGroupsState = (): PadGroupsState => {
  return PAD_GROUP_IDS.reduce((groupsState, groupId) => {
    groupsState[groupId] = createDefaultPadGroupState();
    return groupsState;
  }, {} as PadGroupsState);
};

export const clonePadGroupsState = (padGroupsState: PadGroupsState): PadGroupsState => {
  return PAD_GROUP_IDS.reduce((groupsState, groupId) => {
    groupsState[groupId] = clonePadGroupState(padGroupsState[groupId]);
    return groupsState;
  }, {} as PadGroupsState);
};

export const isPadGroupId = (value: unknown): value is PadGroupId => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    PAD_GROUP_IDS.includes(value as PadGroupId)
  );
};

export const createDuplicatePatternName = (existingNames: string[]): string => {
  const normalizedExistingNames = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  let nextPatternIndex = existingNames.length + 1;
  while (normalizedExistingNames.has(`pattern ${nextPatternIndex}`)) {
    nextPatternIndex += 1;
  }

  return `Pattern ${nextPatternIndex}`;
};
